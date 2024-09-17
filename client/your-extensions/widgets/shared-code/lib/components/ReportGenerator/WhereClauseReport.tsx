import { React } from "jimu-core";
import { ModalBody, ModalFooter, Button } from "jimu-ui";
import RenderErrorLoading from "./RenderErrorLoading";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { NotificationHelper, ReportHelper } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";

/** - Konponenta pro vygenerování protokolu na základě where klauzule. */
export default function(props: HSI.ReportComponent.IWhereClauseReportProps) {
    const messageFormater = useMessageFormater(props.translations);
    const [state, setState] = React.useState<HSI.ReportComponent.IRenderErrorLoadingProps['state']>(null);
    
    React.useEffect(() => {
        let isActive = true;
        (async function() {
            try {
                setState({ reportStatus: ELoadStatus.Pending });

                await ReportHelper.generateReport({
                    fileName: props.fileName,
                    reportBody: {
                        Layout_Template: props.templateName,
                        Web_Map_as_JSON: {
                            expression: props.whereClause
                        }
                    },
                    reportServiceUrl: props.reportServiceUrl
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
    }, [props.fileName, props.reportServiceUrl, props.templateName, props.reportServiceUrl]);

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