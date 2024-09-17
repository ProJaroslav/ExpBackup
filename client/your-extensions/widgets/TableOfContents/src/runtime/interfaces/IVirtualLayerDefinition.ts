/**
 * - Popis neexistujicí(virtuální) vrstvy.
 * - Tato vrstva se sobrazuje ve stromové struktuře widgetu "TableOfContents", a umožňuje aby se jevila jako nadřazená vrstva vrstvám, které jsou ve webmapě zanořené někde jinde.
 */
export interface IVirtualLayerDefinition {
    /** - Název vrstvy zobrazujicí se ve stromové struktuře. */
    title: string;
    /** - Identifikátor virtuální vrstvy. */
    id: string;
}

export default IVirtualLayerDefinition;