import { React } from "jimu-core";
import { Modal, ModalHeader, ModalFooter, Button } from "jimu-ui";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { Suspense, ErrorBoundary } from "widgets/shared-code/components";

const CreateReportFeatureLoader =  React.lazy(() => import("./CreateReportFeature/CreateReportFeatureLoader"));
const FeatureReport =  React.lazy(() => import("./FeatureReport"));
const WhereClauseReport =  React.lazy(() => import("./WhereClauseReport"));

const defaultState: IState = { feature: null, isOpen: false, type: null, fields: [], fileNameTemplate: null, reportServiceUrl: null, reportTable: null }; 

/** Okno pro vygenerování reportu. */
export default React.memo(React.forwardRef<HSI.ReportComponent.IReportGeneratorModalMethods, HSI.ReportComponent.IReportGeneratorModalProps>(function(props, ref) {
    const [state, setState] = React.useState<IState>(defaultState);
    const messageFormater = useMessageFormater(props.translations);

    React.useImperativeHandle(ref, () => ({
        createReportFeature(feature, options) {
            setState({
                isOpen: true,
                type: EStateType.createReportFeature,
                feature,
                fields: options.fields,
                fileNameTemplate: options.fileNameTemplate,
                reportServiceUrl: options.reportServiceUrl,
                reportTable: options.reportTable
            });
        },
        featureReport(feature, options) {
            setState({
                isOpen: true,
                type: EStateType.featureReport,
                feature,
                fields: options.fields,
                fileNameTemplate: options.fileNameTemplate,
                reportServiceUrl: options.reportServiceUrl
            });
        },
        whereClauseReport(options) {
            setState({
                type: EStateType.whereClauseReport,
                fileName: options.fileName,
                isOpen: true,
                reportServiceUrl: options.reportServiceUrl,
                templateName: options.templateName,
                whereClause: options.whereClause
            });
        },
    }), []);

    /** - Funkce pro zavření dialogu na generování reportu. */
    function closeModal() {
        setState(defaultState);
    }

    return <Modal isOpen={state.isOpen}>
        <ModalHeader closeIcon={null}>{messageFormater("generateReportModalHeader")}</ModalHeader>
        <ErrorBoundary
            errorMessageTitle={messageFormater("failedToRenderReport")}
            suffix={<ModalFooter>
                <Button
                    onClick={closeModal}
                    type="danger"
                >
                    {messageFormater("closeReportButton")}
                </Button>
            </ModalFooter>}
        >
            <Suspense>
                <RenderContent
                    close={closeModal}
                    state={state}
                    jimuMapView={props.jimuMapView}
                    translations={props.translations}
                    useTextInputs={props.useTextInputs}
                    onFeatureCreated={props.onFeatureCreated}
                />
            </Suspense>
        </ErrorBoundary>
    </Modal>;
}));

function RenderContent(props: IRenderContentProps) {
    if (!props.state.isOpen) {
        return <></>;
    }

    switch(props.state.type) {
        case EStateType.createReportFeature:
            return <CreateReportFeatureLoader
                feature={props.state.feature}
                closeModal={props.close}
                jimuMapView={props.jimuMapView}
                translations={props.translations}
                useTextInputs={props.useTextInputs}
                fields={props.state.fields}
                fileNameTemplate={props.state.fileNameTemplate}
                reportServiceUrl={props.state.reportServiceUrl}
                reportTable={props.state.reportTable}
                onFeatureCreated={props.onFeatureCreated}
            />;
        case EStateType.featureReport:
            return <FeatureReport
                feature={props.state.feature}
                closeModal={props.close}
                translations={props.translations}
                fields={props.state.fields}
                fileNameTemplate={props.state.fileNameTemplate}
                reportServiceUrl={props.state.reportServiceUrl}
            />;
        case EStateType.whereClauseReport:
            return <WhereClauseReport
                closeModal={props.close}
                fileName={props.state.fileName}
                reportServiceUrl={props.state.reportServiceUrl}
                templateName={props.state.templateName}
                translations={props.translations}
                whereClause={props.state.whereClause}
            />;
        default:
            throw new Error(`Unhandled state type "${props.state['type']}"!`);
    }
}

interface IRenderContentProps extends Pick<HSI.ReportComponent.IReportGeneratorModalProps, "jimuMapView" | "translations" | "useTextInputs" | "onFeatureCreated"> {
    state: IState;
    /** - Funkce pro zavření dialogu na generování protokolu. */
    close: () => void;
}

interface IStateBase<T extends EStateType> {
    /** - Je otevřen dialog pro generování protokolu? */
    isOpen: boolean;
    /** - Typ generování protokolu. */
    type: T;
}

type IState = ICreateReportFeatureState | IFeatureReportState | IwhereClauseReportState;

interface ICreateReportFeatureState extends IStateBase<EStateType.createReportFeature>, Omit<HSI.ReportComponent.ICreateReportFeatureLoaderProps, "closeModal" | "jimuMapView" | "translations" | "useTextInputs" | "onFeatureCreated"> {}
interface IFeatureReportState extends IStateBase<EStateType.featureReport>, Omit<HSI.ReportComponent.IFeatureReportProps, "closeModal" | "translations"> {}
interface IwhereClauseReportState extends IStateBase<EStateType.whereClauseReport>, Omit<HSI.ReportComponent.IWhereClauseReportProps, "closeModal" | "translations"> {}

enum EStateType {
    /** - Otevření dialogu pro vytvoření prvku ze kterého se následně vygeneruje report. */
    createReportFeature = "create-report-feature",
    /** - Vygenerování protokolu z prvku. */
    featureReport = "feature-report",
    /** - Vygenerování protokolu na základě where klauzule. */
    whereClauseReport = "where-clause-report"
}