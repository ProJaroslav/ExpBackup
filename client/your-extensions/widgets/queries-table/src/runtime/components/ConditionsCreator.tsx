import { React, utils, DataSourceManager, Immutable, type DataSourceJson, DataSourceTypes, type DataSource, SqlExpressionMode } from "jimu-core";
import { Button, Badge, Modal, ModalBody, ModalFooter } from "jimu-ui";
import { LayerInfoHelper, NotificationHelper } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { WarningContent } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import translations from "../translations/default";
import { SqlExpressionBuilder } from 'jimu-ui/advanced/sql-expression-builder';
import { ELoadStatus } from "widgets/shared-code/enums";
import { CalciteLoader } from "@esri/calcite-components-react";

const { useEffect, useContext, useState } = React;

/** - Vytvoření SQL omezující podmínka dotazu. */
export default function (props: HSI.QueriesTableWidget.IConditionsCreator) {
    const jimuMapView = useContext(JimuMapViewContext);
    const messageFormater = useMessageFormater(translations);
    const [state, setState] = useState<IStateLoaded | IStateError | IStatePending>({ loadState: ELoadStatus.Pending, isOpen: false });

    useEffect(() => {
        const abortController = new AbortController();
        let dataSource: DataSource;
        if (!!props.selectedClass) {
            setState(({ isOpen }) => ({ loadState: ELoadStatus.Pending, isOpen }));
            (async function() {
                try {
                    const layers = await LayerInfoHelper.findLayersByDataset(jimuMapView, props.selectedClass.objectClass)

                    if (layers.length > 0) {

                        const id = utils.getUUID();
                        
                        const dsBetterJSon: DataSourceJson = { id, type: DataSourceTypes.FeatureLayer, url: layers[0].url };
                        
                        dataSource = await DataSourceManager.getInstance().createDataSource({
                            id,
                            dataSourceJson: Immutable(dsBetterJSon)
                        });
                        
                        if (!abortController.signal.aborted) {
                            setState(({ isOpen }) => ({ loadState: ELoadStatus.Loaded, isOpen, dataSource }));
                        } else {
                            dataSource.destroy();
                            dataSource = undefined;
                        }
                    }
                } catch(error) {
                    if (!abortController.signal.aborted) {
                        console.warn(error);
                        setState(({ isOpen }) => ({ loadState: ELoadStatus.Error, isOpen, error }));
                    }
                }
            })();
        } else {
            setState(({ isOpen }) => ({ loadState: ELoadStatus.Loaded, isOpen, dataSource }));
        }

        return function() {
            abortController.abort();
            if (!!dataSource) {
                dataSource.destroy();
            }
        }
    }, [props.selectedClass, jimuMapView, setState]);

    const conditionLength = props.sqlExpression?.getIn(["parts", "length"]) || 0;

    return <div className="conditions-creator">
        <Badge
            color="primary"
            badgeContent={conditionLength}
            hideBadge={conditionLength < 1}
        >
            <Button
                disabled={!props.selectedClass}
                onClick={() => setState(st => ({ ...st, isOpen: true }))}
                size="sm"
            >
                {messageFormater("openConditionBuilder")}
            </Button>
        </Badge>
        <Modal
            toggle={() => setState(st => ({ ...st, isOpen: false }))}
            isOpen={state.isOpen}
            centered
            modalClassName="queries-table-sql-expression-builder"
        >
            <ModalBody>
                {
                    function() {
                        switch(state.loadState) {
                            case ELoadStatus.Error:
                                return <WarningContent
                                    message={NotificationHelper.getErrorMessage(state.error)}
                                    title={messageFormater("conditionBuilderError")}
                                />;

                            case ELoadStatus.Loaded:
                                return <SqlExpressionBuilder
                                    dataSource={state.dataSource}
                                    expression={props.sqlExpression}
                                    mode={SqlExpressionMode.Simple}
                                    onChange={props.onExpressionChange}
                                />;

                            case ELoadStatus.Pending:
                            default:
                                return <CalciteLoader label='' scale='m' />;
                        }
                    }()
                }
            </ModalBody>
            <ModalFooter>
                <Button
                    type="primary"
                    onClick={() => setState(st => ({ ...st, isOpen: false }))}
                >
                    {messageFormater("closeConditionBuilderModal")}
                </Button>
            </ModalFooter>
        </Modal>
    </div>;
}

interface IStatePending extends IStateBase<ELoadStatus.Pending> {
}

interface IStateLoaded extends IStateBase<ELoadStatus.Loaded> {
    dataSource: DataSource;
}

interface IStateError extends IStateBase<ELoadStatus.Error> {
    /** - Odchycená chyba při načítání. */
    error: __esri.Error | Error;
}

interface IStateBase<T extends ELoadStatus> {
    /** - Stav načtení. */
    loadState: T;
    /** - Je otevřený modál pro vytvoření SQL omezující podmínky. */
    isOpen: boolean;
}