import { React } from "jimu-core";
import { Card, CardBody, CardFooter, Button } from "jimu-ui";
import { useMessageFormater, useConfig } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { LayerHelper, LayerDefinitionHelper, ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import AttachmentMenu from "./AttachmentMenu";
import LayerConfigurationContext from "../contexts/LayerConfigurationContext";
import translations from "../translations/default";

const ModuleLoader = new ArcGISJSAPIModuleLoader(["Attachments"]);

/** - Zobrazení připojených dokumentů a jejich správa. */
export default function(props: IDocumentsProps) {
    /** - Element ve kterém se zobrazují dikumenty. */
    const attachmentsContainnerRef = React.useRef<HTMLDivElement>();
    /**
     * - Widget pro zobrazení dokumentů.
     * - @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-widgets-Attachments.html}
     */
    const attachmentsRef = React.useRef<__esri.Attachments>()
    /** - Přerenderování komponenty. */
    const forceUpdate = React.useReducer(f => !f, false)[1];
    const messageFormater = useMessageFormater(translations);
    /** - Název atributu, ve kterém je uložen identidikátor hlavního dokumentu. */
    const [mainAttachmentIdAttribute, setMainAttachmentIdAttribute] = React.useState<string>();
    const jimuMapView = React.useContext(JimuMapViewContext);
    const editabilityConfiguration = React.useContext(LayerConfigurationContext);
    const config = useConfig<HSI.SelectionResultWidget.IMConfig>();

    /** - Načtení {@link attachmentsRef}, a vyhledání {@link mainAttachmentIdAttribute}. */
    React.useEffect(() => {
        const abortController = new AbortController();
        const listeners: Array<IHandle> = [];

        /** - Načtení widgetu pro zobrazení dokumentů {@link attachmentsRef}. */
        async function createAttachmetns() {
            try {
                if (!ModuleLoader.isLoaded) {
                    await ModuleLoader.load();
                }
                const container = document.createElement("div");
                attachmentsContainnerRef.current.appendChild(container);

                /** - Vrstva, ve které se budou vyhledávat přílohy pro {@link props.feature prvek}. */
                let layer: __esri.FeatureLayer;

                if (props.tableFeature) {
                    layer = await LayerHelper.duplicateTable(jimuMapView, LayerHelper.getTableFromFeature(props.feature), true);
                } else {
                    layer = await LayerHelper.createFeatureLayer(LayerHelper.getSublayerFromFeature(props.feature));
                }

                const featureSet = await layer.queryFeatures({
                    objectIds: [props.feature.getObjectId()],
                    returnGeometry: false,
                    outFields: ["*"]
                }, { signal: abortController.signal });

                attachmentsRef.current = new (ModuleLoader.getModule("Attachments"))({
                    container,
                    graphic: featureSet.features[0],
                    displayType: "list"
                });

                listeners.push(
                    attachmentsRef.current.viewModel.watch(["state", "mode"], () => {
                        setTimeout(forceUpdate, 100);
                    }),
                    attachmentsRef.current.watch("error", error => {
                        /**
                         * Tato chyba se vyskytuje na produkci LetGIS. Nevíme proč, ale příloha se přidá, ale nepodaří se ji načíst. Přepneme tedy na seznam příloh a refreshneme přílohy.
                         * Chyba viz úkol https://hsi0916.atlassian.net/browse/LETGIS-574
                         * @todo - Najit způsob jak vyřešit na straně serveru a odebrat nasloucháni
                         */
                        if (error?.name === "attachments:add-attachment" && error?.details?.message === "Cannot read properties of undefined (reading '0')") {
                            attachmentsRef.current.viewModel.mode = "view";
                            attachmentsRef.current.viewModel.getAttachments();
                        }
                    })
                );

            } catch(err) {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                }
            }
        };

        /** - Vyhledání {@link mainAttachmentIdAttribute}. */
        async function loadMainAttachmentIdAttribute() {
            try {
                let mainAttribute: string;
                if (!props.tableFeature) {
                    if (Array.isArray(props.attachmentsSetting.sublayers)) {
                        const sublayerDefinition = await LayerDefinitionHelper.getSublayerDefiniton(LayerHelper.getSublayerFromFeature(props.feature));
                        for (let sublayerInfo of props.attachmentsSetting.sublayers) {
                            if (LayerDefinitionHelper.matchDefinition(sublayerInfo.layer, sublayerDefinition)) {
                                mainAttribute = sublayerInfo.attribute;
                                break;
                            }
                        }
                    }
                } else if (Array.isArray(props.attachmentsSetting.tables)) {
                    const tableDefinition = await LayerDefinitionHelper.getTableDefiniton(jimuMapView, LayerHelper.getTableFromFeature(props.feature));
                    for (let tableInfo of props.attachmentsSetting.tables) {
                        if (LayerDefinitionHelper.matchDefinition(tableDefinition, tableInfo.layer)) {
                            mainAttribute = tableInfo.attribute;
                            break;
                        }
                    }
                }

                if (!abortController.signal.aborted) {
                    setMainAttachmentIdAttribute(mainAttribute);
                }
            } catch(err) {
                console.warn(err);
            }
        }

        createAttachmetns();
        loadMainAttachmentIdAttribute();

        return function() {
            setMainAttachmentIdAttribute(null);
            abortController.abort();
            if (attachmentsRef.current && !attachmentsRef.current.destroyed) {
                attachmentsRef.current.destroy();
            }

            listeners.forEach(listener => listener.remove());
        }
    }, [props.feature, attachmentsContainnerRef, props.attachmentsSetting, jimuMapView, props.tableFeature, props.tableFeature]);

    React.useEffect(() => {
        props.setAdditionalDocumentInfo(typeof attachmentsRef.current?.viewModel?.attachmentInfos?.length === "number" ? ` (${attachmentsRef.current.viewModel.attachmentInfos.length})` : "");
    }, [attachmentsRef.current?.viewModel?.attachmentInfos?.length])

    return <Card className="tab-card">
        {
            attachmentsRef.current?.viewModel?.state === "ready" && attachmentsRef.current?.viewModel?.mode === "view" ? attachmentsRef.current.viewModel?.attachmentInfos?.map(attachmentInfo => {
                return <AttachmentMenu
                    key={attachmentInfo.id}
                    attachmentInfo={attachmentInfo}  
                    attachmentsRef={attachmentsRef}
                    forceUpdate={forceUpdate}
                    mainAttachmentIdAttribute={mainAttachmentIdAttribute}
                    editabilityConfiguration={editabilityConfiguration}
                />;
            }) : <></>
        }
        <CardBody className="document-wrapper" innerRef={attachmentsContainnerRef}></CardBody>
        {
            editabilityConfiguration.allowAddAttachment && !config.forbidEditing ? (
                <CardFooter>
                    <Button onClick={() => attachmentsRef.current.viewModel.mode = "add"} >{messageFormater("addAttachmentButton")}</Button>
                </CardFooter>
            ) : <></>
        }
    </Card>;
}

interface IDocumentsProps {
    /** - Prvek označený ve stromové struktuře. */
    feature: __esri.Graphic;
    /** - Konfigurace podvrstev, které mají hlavní soubor zobrazujicí se v pop-upu. */
    attachmentsSetting: HSI.DbRegistry.IAttachmentsDbValue;
    /** - Nastavení dodatečných informací, které se zobrazí v titulku záložky dokumentů. */
    setAdditionalDocumentInfo: React.Dispatch<React.SetStateAction<string>>;
    /** - Jedná se o negrafický prvek? */
    tableFeature: boolean;
};
