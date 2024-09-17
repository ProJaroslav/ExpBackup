import { React, useIntl } from "jimu-core";
import { ModalBody, ModalFooter, Button } from "jimu-ui";
import RenderErrorLoading from "./RenderErrorLoading";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { NotificationHelper, LayerHelper, ReportHelper } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";

/** - Konponenta pro vygenerování protokolu. */
export default function(props: HSI.ReportComponent.IFeatureReportProps) {
    const messageFormater = useMessageFormater(props.translations);
    const [state, setState] = React.useState<HSI.ReportComponent.IRenderErrorLoadingProps['state']>(null);
    const intl = useIntl();
    
    React.useEffect(() => {
        let isActive = true;
        (async function() {
            try {
                setState({ reportStatus: ELoadStatus.Pending });

                /** - Pole, podle kterého se určuje jaký protokol se vygeneruje. */
                const layoutField = props.fields.find(field => Array.isArray(field.reportOptions));

                await ReportHelper.generateFeatureReport({
                    feature: props.feature,
                    intl,
                    table: LayerHelper.getTableFromFeature(props.feature),
                    fileNameTemplate: props.fileNameTemplate,
                    reportServiceUrl: props.reportServiceUrl,
                    reportOptions: layoutField?.reportOptions,
                    reportOptionField: layoutField?.fieldName
                });

                if (isActive) {
                    NotificationHelper.addNotification({ message: messageFormater("reportSuccessMessage"), type: "success" });
                    props.closeModal();
                }
            } catch(error) {
                console.warn(error);
                if (isActive) {
                    setState({
                        error,
                        reportStatus: ELoadStatus.Error
                    });
                }
            }
        })();

        return function() {
            isActive = false;
        }
    }, [props.feature, props.fields, props.fileNameTemplate, props.reportServiceUrl]);

    return <>
        <ModalBody>
            <RenderErrorLoading
                state={state}
                translations={props.translations}
            />
        </ModalBody>
        <ModalFooter>
            <Button
                onClick={props.closeModal}
                type="danger"
                disabled={state?.reportStatus === ELoadStatus.Pending}
            >
                {messageFormater("closeReportButton")}
            </Button>
        </ModalFooter>
    </>;
}