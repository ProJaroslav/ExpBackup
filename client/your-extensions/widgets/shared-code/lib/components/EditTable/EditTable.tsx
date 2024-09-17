import { React, useIntl, utils } from "jimu-core";
import { EFieldAlias, ELoadStatus } from "widgets/shared-code/enums";
import { AttributeInput, RequiredField, Table, WarningContent } from "widgets/shared-code/components";
import { FeatureHelper, NotificationHelper } from "widgets/shared-code/helpers";
import { useFieldAlias, useForceUpdate, useMessageFormater } from "widgets/shared-code/hooks";
import { CalciteLoader } from "calcite-components";
import translations from "../translations/default";

const { useState, forwardRef, useImperativeHandle, useRef, useEffect } = React;

const pendingState: HSI.EditTableComponent.IState = { loadStatus: ELoadStatus.Pending };

export default forwardRef<HSI.EditTableComponent.IRef, HSI.EditTableComponent.IProps>(function({ setTableStateOpen, saveSuccessMessage, requiredValueMissing, failedToSaveMessage, loadMetadataErrorMessage }, ref) {
    const [state, setState] = useState<HSI.EditTableComponent.IState>(pendingState);
    const messageFormater = useMessageFormater(translations);
    const lastCallIdRef = useRef<string>();
    const editTableRef = useRef<Pick<HSI.EditTableComponent.IRef, "save">>();
    const setTableStateOpenRef = useRef(setTableStateOpen);

    useImperativeHandle(ref, () => ({
        load(dataProvider) {
            const callId = lastCallIdRef.current = utils.getUUID();
            setState(pendingState);

            dataProvider()
                .then(({ feature, fields }) => {
                    if (callId === lastCallIdRef.current) {
                        setState({ loadStatus: ELoadStatus.Loaded, feature, fields });
                    }
                })
                .catch(err => {
                    if (callId === lastCallIdRef.current) {
                        console.warn(err);
                        setState({ loadStatus: ELoadStatus.Error, errorMessage: NotificationHelper.getErrorMessage(err) });
                    }
                })
        },
        save(saveFeature) {
            return editTableRef.current.save(saveFeature);
        },
        empty() {
            lastCallIdRef.current = undefined;
            setState(pendingState);
        },
    }), [setState, lastCallIdRef, editTableRef]);

    useEffect(() => {
        setTableStateOpenRef.current = setTableStateOpen;
    });

    useEffect(() => {
        if (typeof setTableStateOpenRef.current === "function") {
            setTableStateOpenRef.current(true);
    
            return function() {
                setTableStateOpenRef.current(false);
                lastCallIdRef.current = undefined;
            }
        }
    }, [lastCallIdRef, setTableStateOpenRef]);
    
    if (state.loadStatus === ELoadStatus.Pending) {
        return <CalciteLoader label="" scale="l" />;
    }
    
    if (state.loadStatus === ELoadStatus.Error) {
        return <WarningContent message={state.errorMessage} title={loadMetadataErrorMessage || messageFormater("failedToLoadEditTableFeature")} />;
    }

    return <EditTable
        ref={editTableRef}
        feature={state.feature}
        fields={state.fields}
        requiredValueMissing={requiredValueMissing}
        failedToSaveMessage={failedToSaveMessage}
        saveSuccessMessage={saveSuccessMessage}
        lastCallIdRef={lastCallIdRef}
    />;
});

const EditTable = forwardRef<Pick<HSI.EditTableComponent.IRef, "save">, IEditTable>(({ feature, fields, failedToSaveMessage, lastCallIdRef, requiredValueMissing, saveSuccessMessage }, ref) => {
    const getFieldAlias = useFieldAlias(feature, EFieldAlias.default);
    const intl = useIntl();
    const forceUpdate = useForceUpdate();
    const [isSaving, toggleIsSaving] = useState<boolean>(false);
    const messageFormater = useMessageFormater(translations);

    useImperativeHandle(ref, () => ({
        async save(saveFeature) {
            const callId = lastCallIdRef.current = utils.getUUID();
            try {
                if (fields.some(({ nullable, name }) => !nullable && !feature.getAttribute(name))) {
                    NotificationHelper.addNotification({ title: requiredValueMissing || messageFormater("renterRequiredValueMissing"), type: "warning" });
                    return;
                }
                toggleIsSaving(true);
                await saveFeature(feature, fields);
                NotificationHelper.addNotification({ title: saveSuccessMessage || messageFormater("saveSuccess"), type: "success" });
                if (callId === lastCallIdRef.current) {
                    toggleIsSaving(false);
                }
            } catch(err) {
                if (callId === lastCallIdRef.current) {
                    console.warn(err);
                    NotificationHelper.handleError(failedToSaveMessage || messageFormater("failedToSaveEditTableFeature"), err);
                    toggleIsSaving(false);
                }
            }
        },
    }), [failedToSaveMessage, messageFormater, feature, fields, requiredValueMissing, saveSuccessMessage]);

    if (isSaving) {
        return <CalciteLoader label="" scale="l" />;
    }

    return <Table
        rows={fields.map(field => {
            let value: string | number | JSX.Element;
            let alias: string | JSX.Element = getFieldAlias(field);
            if (field.editable) {
                value = <AttributeInput
                    key={field.name}
                    feature={feature}
                    field={field}
                />;
                alias = <RequiredField
                    key={field.name}
                    field={field}
                    alias={alias}
                />;
            } else {
                value = FeatureHelper.getFeatureValue(feature, field, { intl, onLoad: forceUpdate });
            }
            
            return [
                alias,
                value
            ];
        })}
    />;
})

interface IEditTable extends Omit<HSI.EditTableComponent.IProps, "loadMetadataErrorMessage" | "setTableStateOpen">, HSI.EditTableComponent.ILoadedState {
    lastCallIdRef: React.MutableRefObject<string>;
}