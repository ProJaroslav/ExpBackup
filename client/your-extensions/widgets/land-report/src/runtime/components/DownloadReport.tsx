import { React } from "jimu-core";
import { Button } from "jimu-ui";
import { ELoadStatus } from "widgets/shared-code/enums";
import { WarningContent } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { AssetsProviderContext } from "widgets/shared-code/contexts";
import { CalciteLoader } from "calcite-components";
import translations from "../translations/default"; 

const { useContext } = React;
const fileType: string = "data:application/xlsx;base64";

/** - Zobrazení výsledku dotazu s možností stáhnutí excelu. */
export default function({ landSearchState }: Pick<HSI.UseLandQueries.ILandSearchReturn, "landSearchState">) {
    const messageFormater = useMessageFormater(translations);
    const assetsProvider = useContext(AssetsProviderContext);

    return <div className="download-report">
        <hr/>
        {function() {
            if (!landSearchState) {
                return <></>;
            }

            if (landSearchState.loadStatus === ELoadStatus.Pending) {
                return <CalciteLoader label="" scale="l" />;
            }

            if (landSearchState.loadStatus === ELoadStatus.Error) {
                return <WarningContent title={messageFormater("failedToExecuteQuery")} message={landSearchState.errorMessage} />;
            }

            if (!landSearchState.response.IsReport) {
                return <WarningContent title={messageFormater("resultIsNotFile")} />;
            }

            return <div>
                <img
                    src={assetsProvider("spreadsheet.png")}
                />
                <section>
                    <p><b>{messageFormater("excelResponseTitle")}</b></p>
                    <Button
                        className="open-file-button"
                        type="primary"
                        href={encodeURI(`${fileType},${landSearchState.response.FileBase64}`)}
                        //@ts-ignore
                        download={`${landSearchState.queryParams?.query?.Description}.xlsx`}
                    >
                        {messageFormater("openFileButton")}
                    </Button>
                    {
                        function () {
                            if (!Array.isArray(landSearchState.queryParams?.query?.Parameters) || landSearchState.queryParams.query.Parameters.length < 1) {
                                return <></>;
                            }

                            return <>
                                <span>{messageFormater("parameretsResponse")}</span>
                                <ul>
                                    {
                                        landSearchState.queryParams.query.Parameters.map(({ Name, Caption }) => {
                                            return <li key={Name}>{Caption}: {landSearchState.queryParams.queryParametresValues[Name]}</li>;
                                        })
                                    }
                                </ul>
                            </>;
                        }()
                    }
                    <p>{messageFormater("fileSize").replace("{0}", (Math.ceil(landSearchState.response.FileSize / 10.24) / 100).toString())}</p>
                </section>
            </div>;

        }()}
    </div>
}