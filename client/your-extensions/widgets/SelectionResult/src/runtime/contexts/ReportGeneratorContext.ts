import { React } from "jimu-core";

/** - Poskytuje referenci komponenty pro generování protokolu. */
export const ReportGeneratorContext = React.createContext<React.MutableRefObject<HSI.ReportComponent.IReportGeneratorModalMethods>>(null);

export default ReportGeneratorContext;