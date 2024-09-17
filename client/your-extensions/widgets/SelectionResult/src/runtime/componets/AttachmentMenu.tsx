import { React, ReactDOM } from "jimu-core";
import { Icon, DropdownButton, Dropdown, DropdownItem, DropdownMenu } from "jimu-ui";
import { useMessageFormater, useConfig } from "widgets/shared-code/hooks";
import { AssetsProviderContext } from "widgets/shared-code/contexts";
import { NotificationHelper } from "widgets/shared-code/helpers";
import translations from "../translations/default";

/** - Přidání menu s funkcemi do elementu s dokumentem. */
export default function(props: IAttachmentMenu) {
    const assetsProvider = React.useContext(AssetsProviderContext);
    const messageFormater = useMessageFormater(translations);
    /** - Prvek ze kterého dokument pochází. */
    const feature = props.attachmentsRef.current.graphic;
    /** - Identifikátor hlavního dokumentu. */
    const mainAttributeId = feature.getAttribute(props.mainAttachmentIdAttribute);
    const config = useConfig<HSI.SelectionResultWidget.IMConfig>();

    /** - Element ve kterém jsou dokumenty. */
    let container: HTMLElement;
    
    if (typeof props.attachmentsRef.current.container === "string") {
        container = document.getElementById(props.attachmentsRef.current.container);
    } else {
        container = props.attachmentsRef.current.container;
    }
    
    /** - Element se seznamem dokumentů. */
    const attachmentList = findElementByClassName(container, "esri-attachments__items");

    if (attachmentList) {
        /** - Poloha elementu s tímto dokumentem v {@link attachmentList}. */
        const index = props.attachmentsRef.current.viewModel.attachmentInfos.findIndex(attachmentInfo => attachmentInfo === props.attachmentInfo);
        /** - Element zobrazujicí tento dokument. */
        const attachmentElement = attachmentList.children.item(index) as HTMLElement;
        /** - Může být soubor zobrazen jako hlavní obrázek v pop-upu? */
        let allowDefineMainAttachment = props.editabilityConfiguration.allowDefineMainAttachment && props.attachmentInfo.id !== mainAttributeId && !config.forbidEditing;
        /** - Ikona vyznačujicí . */
        let mainAttachmentInfoPortal: React.ReactPortal;


        if (attachmentElement) {
            //#region - Přepsání obrázku. 
            try {
                if (props.attachmentInfo.contentType.startsWith('image')) {
                    /** - Html element obalujicí {@link image}. */
                    const imageWrapper = findElementByClassName(attachmentElement, "esri-attachments__item-mask") as HTMLDivElement;
                    /** - Html element náhledu obrázku. */
                    const image = findElementByClassName(attachmentElement, "esri-attachments__image") as HTMLImageElement;
    
                    if (image) {
                        if (image.parentElement) {
                            image.parentElement.style.padding = "0";
                        }
    
                        image.src = props.attachmentInfo.url;
            
                        image.style.width = "auto";
                        image.style.height = "auto";
            
                        image.style.maxWidth = "100%";
                        image.style.maxHeight = "100%";
                    }

                    
                    if (props.attachmentInfo.id === mainAttributeId && imageWrapper) {
                        imageWrapper.style.position = "relative";

                        mainAttachmentInfoPortal = ReactDOM.createPortal(<Icon
                            color="white"
                            icon={assetsProvider("home.svg")}
                            style={{ position: "absolute", right: 5, bottom: 5 }}
                        />, imageWrapper);
                    }
        
                } else {
                    // Hlavní soubor může být pouze obrázek.
                    allowDefineMainAttachment = false;
                }
            } catch(err) {
                console.warn(err);
            }
            //#endregion

            /** - Odstranění dokumentu. */
            async function deleteAttachment() {
                try {
                    if (props.editabilityConfiguration.allowDeleteAttachment && !config.forbidEditing) {
                        const layer = feature.layer as __esri.FeatureLayer;
    
                        await layer.deleteAttachments(feature, [props.attachmentInfo.id]);

                        props.attachmentsRef.current.viewModel.attachmentInfos.splice(props.attachmentsRef.current.viewModel.attachmentInfos.findIndex(attachmentInfo => attachmentInfo === props.attachmentInfo), 1);
    
                        props.forceUpdate();
                    }
                } catch(err) {
                    console.warn(err);
                    NotificationHelper.addNotification({ type: "warning", message: messageFormater("deleteAttachmentFailed") });
                }
            }

            /** - Zvolení dokumentu jako hlavní (bude se zobrazovat v pop-upu). */
            async function createPopUpAttachment() {
                try {
                    if (allowDefineMainAttachment) {

                        feature.setAttribute(props.mainAttachmentIdAttribute, props.attachmentInfo.id);

                        const layer = feature.layer as __esri.FeatureLayer;
    
                        await layer.applyEdits({ updateFeatures: [feature] });
    
                        props.forceUpdate();
                    }
                } catch(err) {
                    console.warn(err);
                    NotificationHelper.addNotification({ type: "warning", message: messageFormater("makeMainFileError") });
                }
            }

            attachmentElement.style.position = "relative";

            return <>
                {mainAttachmentInfoPortal}
                {
                    ReactDOM.createPortal(<Dropdown
                        className="attachment-menu"
                    >
                        <DropdownButton
                            arrow={false}
                            disabled={(!props.editabilityConfiguration.allowDeleteAttachment && !allowDefineMainAttachment) || config.forbidEditing}
                        >
                            <Icon icon={assetsProvider("menu.svg")} />
                        </DropdownButton>
                        <DropdownMenu>
                            {
                                allowDefineMainAttachment ? (
                                    <DropdownItem
                                        onClick={createPopUpAttachment}
                                    >
                                        {messageFormater("mainAttachmentButton")}
                                    </DropdownItem>
                                ) : <></>
                            }
                            {
                                props.editabilityConfiguration.allowDeleteAttachment && !config.forbidEditing ? (
                                    <DropdownItem
                                        onClick={deleteAttachment}
                                    >
                                        {messageFormater("deleteAttachmentButton")}
                                    </DropdownItem>
                                ) : <></>
                            }
                        </DropdownMenu>
                    </Dropdown>, attachmentElement)
                }
            </>;

        }
    }

    return <></>; 
}

interface IAttachmentMenu {
    /** - Informace o dokumentu. */
    attachmentInfo: __esri.AttachmentInfo;
    /** - Reference widgetu zobrazujicí dokumenty. */
    attachmentsRef: React.MutableRefObject<__esri.Attachments>;
    /** - Přerenderování komponenty. */
    forceUpdate: () => void;
    /** - Název atributu, ve kterém je uložen identidikátor hlavního dokumentu. */
    mainAttachmentIdAttribute: string;
    /** - Konfigurace editovatelnosti pro podvrstvu ze které pochází označený prvek. */
    editabilityConfiguration: HSI.DbRegistry.ISublayerEditabilityConfiguration | HSI.DbRegistry.ITableEditabilityConfiguration;
}

/**
 * - Vyhledání elementu podle třídy.
 * @param parent - Element v jehož potomcích element hledáme.
 * @param className - Třída kterou hledáme.
 */
function findElementByClassName(parent: Element, className: string): HTMLElement {
    if (parent.classList.contains(className)) {
        return parent as HTMLElement;
    }

    if (parent.hasChildNodes()) {
        for (let index = 0; index < parent.children.length; index++) {
            let attachmentList = findElementByClassName(parent.children.item(index), className);
            if (attachmentList) {
                return attachmentList;
            }
        }
    }
}
