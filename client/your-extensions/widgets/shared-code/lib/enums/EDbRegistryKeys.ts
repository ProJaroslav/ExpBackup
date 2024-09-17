/**
 * - Názvy položek, pod kterými jsou uložené hodnoty v databázovém registru.
 * - Jedná se pouze o konec názvů. Celý název je tvořen kombinací {@link IHsiSetting globálního nastavení} a tohoto enum listu.
 * - Pro přehlednost používat smyslupné názvy.
 * - [Read more...](https://hsi0916.atlassian.net/wiki/spaces/LETGIS/pages/2861924359/Db+registr+s+konfigurac#N%C3%A1zvy-kl%C3%AD%C4%8D%C5%AF)
 */
export enum EDbRegistryKeys {
    Floors = "gdb.floors.json",
    /** - Název atributu, který reprezentuje parametr 'featureId' v objektu pod kličem 'select', při vyhledávání podle URL. */
    SelectFeatureIdAttribute = "gdb.url.featureid.attribute",
    /** - Url mapové služby, která se pooužije pro přehledovou mapu. */
    MapOwerviewUrl = "gdb.mapoverview.url",
    /** - Výchozí rozsah přehledové mapy. */
    MapOwerviewExtent = "gdb.mapoverview.extent.json",
    /**
     * - Identifikátory vrstev, které se budou zobrazovat v atributové tabulce.
     * - Tento klič lze rozšířit o specifikaci aplikace, která se zadává v konfiguraci widgetu "AttributeTable".
     */
    AttributeTableLayers = "gdb.table.layers.json",
    /** - Maximální počet záznamů, který lze vyexportovat z atributové tabulky. */
    AttributeTableMaxExportSize = "gdb.table.maxexportsize",
    /**
     * - Informace zda při exportu do csv z atributové tabulce chceme přeložit doménové hodnoty.
     * - Tento klič lze rozšířit o specifikaci aplikace, která se zadává v konfiguraci widgetu.
     */
    AttributeTableDomainTranslation = "gdb.table.translate.domain",
    /**
     * - Editovatelnost podvrstev a atributů.
     * - Tento klič lze rozšířit o specifikaci aplikace, která se zadává v konfiguraci widgetu "SelectionResult".
     */
    Editability = "gdb.editability.json",
    /**
     * - Nastavení viditelnosti a vybíratelnosti vstev, a rozsahu mapy.
     * - Tento klič lze rozšířit o specifikaci aplikace, která se zadává v konfiguraci widgetu.
     */
    Bookmarks = "gdb.bookmarks.json",
    /** - Identifikátory vrstev ve kterých lze vytvořit žádanku. */
    BookRooms = "gdb.bookrooms.json",
    /** - Negrafické vrstvy a atributy, které se používají k získání organizačních jednotek a nákladových středisek. */
    BookRoomInfo = "gdb.bookroom.info.json",
    /**
     * - Vrstvy, ve kterých lze vytvořit nový prvek.
     * - Tento klič lze rozšířit o specifikaci aplikace, která se zadává v konfiguraci widgetu "NewFeature".
     */
    NewFeaturesLayers = "gdb.newfeature.layers.json",
    /** - Konfigurace pro widget 'Search' a vyhledávání přes URL. */
    Search = "gdb.search.json",
    /** - Nastavení funkcí v kontextové nabídce výsledků výběru (widget "SelectionResult"). */
    SelectionContextMenu = "gdb.selection.context.menu.json",
    /** - Nastavení vrstev, které mají hlavní soubor zobrazujicí se v pop-upu. */
    Attachments = "gdb.popup.attachments.json",
    /** - Definice všech typů vlastních (custom) relačních tříd prvků je uložena v Db registru. */
    RelationshipQueries = "mapservice.relationship.queries.json",
    /** - Konfigurace widgetu "LocateCoordinate". */
    LocateSettings = "gdb.locator.json",
    /** - Url adresa tiskových služeb. */
    Print = "gdb.print.url",
    /** - Podkladové mapy mezi kterými lze v aplikaci přepínat. */
    Basemaps = "gdb.basemap.json",
    /** - Maximální počet záznamů ve výběru. */
    MaxSelectionCount = "gdb.max.selection.count",
    /** - Barva geometrie prvků ve výběru. */
    SelectionColor = "gdb.selection.color",
    /** - Počet pixelů o kolik se rozšíří vyhledávání výběru bodových prvků bodovou geometrií. */
    SelectionPointDistance = 'gdb.selection.distance',
    /** - Počet pixelů o kolik se rozšíří vyhledávání výběru liniových prvků bodovou geometrií. */
    SelectionPolylineDistance = 'gdb.selection.polyline.distance',
    /** - Počet pixelů o kolik se rozšíří vyhledávání výběru polygonových prvků bodovou geometrií. */
    SelectionPolygonDistance = 'gdb.selection.polygon.distance',
    /** - Struktura zobrazení vrstev ve stromové struktuře widgetu 'TableOfContents'. */
    TableOfContents = "gdb.tableofcontents.json",
    /** - Konfigurace widgetu "CoordinateConversion". */
    CoordinateConversion = "gdb.coordinate.conversion.json",
    /** - Název widgetu, který se má zavřít, podkud dojde k zrušení výběru. */
    SelectionDropWidget = "gdb.selection.drop.widget",
    /** - Název widgetu, který se má otevřít, podkud dojde k výběru. */
    SelectionOpenWidget = "gdb.selection.open.widget",
    /** - Konfigurace zobrazení metadat vrstev. */
    Metadata = 'gdb.metadata.json',
    /**
     * - Má se v popupu, vyvolaným kliknutím do mapy, zobrazit pouze prvky z vrchní vrstvy?
     * - Tento klič lze rozšířit o specifikaci aplikace, která se zadává v konfiguraci widgetu.
     */
    PopupTopFeatureOnly = 'gdb.popup.top.feature.only',
    /**
     * - Má se v popupu, vyvolaným kliknutím do mapy, prvky zobrazit v pořadí jak jsou v mapě?
     * - Relevantní pouze pokud {@link PopupTopFeatureOnly} není 'true'.
     * - Tento klič lze rozšířit o specifikaci aplikace, která se zadává v konfiguraci widgetu.
     */
    PopupOrderFeatures = 'gdb.popup.order.features',
    /** - Barva, kterou se zvýrazní geometrie prvku zvoleného ve widgetu "SelectionResult". */
    HighlightColor = "gdb.selection.highlight.color",
    /** - Chceme do popupu přidat tlačítko, které prvek přidá do výběru? */
    PopupSelectButton = 'gdb.popup.select.button',
    /** - Definice vrstev, ve kterých se vyhledává geometrie pro negrafické prvky. */
    GeometryProvider = 'gdb.geometry.providers.json',
    /** - Nastavení tlačítka v popupu, které zobrazí nový popup s navazbenými prvky. */
    PopupFeatureQuery = 'gdb.popup.feature.query.json',
    /** - Nastavení vrstev u kterých se popupu načte a zobrazí výška terénu. */
    PopupHeight = 'gdb.popup.height.json',
    /** - Identifikátor skupiny, podle které se zobrazují dostupné aplikace ve widgetu 'ApplicationList'. */
    ApplicationListGroupId = 'gdb.application.list.group',
    /** - URL adresa geometrické služby (Pokud není definováno použije se {@link __esri.config.geometryServiceUrl}). */
    GeometryServiceUrl = 'gdb.geometry.service.url',
    /**
     * - Informace zda se po výběru má automaticky provést zoom na vybrané prvky.
     * - Pokud není určeno jinak, tak se zoom provádí.
     */
    SelectionAutoZoom = 'gdb.selection.autozoom',
    /** - Měřítko na které se má přiblížit, pokud se přibližujeme na geometrii bez extentu (samostatný bod). */
    /** @todo */
    PointZoomScale = 'gdb.point.zoom.scale',
    /** - Nastavení omezení hodnot atributu v prvku na základě hodnot jiných atributů. */
    ContingentValues = 'gdb.contingent.values.json',
    /** - Nastavení formátu zobrazení prvků. */
    DisplayFeatureFormat = 'gdb.display.feature.format.json',
    /** - Nastavení widgetu ObstacleAreas (LetGIS widget). */
    ObstacleAreas = 'gdb.obstacle.areas.json',
    /**
     * - Má se provádět aktualizace tokenu pro standardní esri request?
     * - V ideálním případě by mělo být "false".
     * - Pro mapovou službu LetGISTech (projekt LetGIS) nám po vypršení tokenu vyskakuje přihlašovací okno, tímto řešením se tomu zabrání.
     */
    RefeshToken = 'gdb.token.refresh',
    /** - Má se zabráňit standadním výběům ExB? */
    DisableSelection = 'gdb.disable.selection',
    /**
     * - Má se při kreslení bodu (Výběry, ObstacleAreas) zobrazovat transparentní geometrie?.
     * - Výchozí hodnota je true.
     */
    RemoveSketchDot = 'gdb.remove.sketch.dot',
    /**
     * - URL adresa aplikace, která se používá při generování odkazu na prvek.
     * - Tato aplikace buď otevírá novou aplikaci nebo předá parametry již bežící aplikaci v jiné záložce.
     */
    RedirectAppUrl = "redirect.app.url",
    /**
     * - Máji se relační třídy zjišťovat jednotlivě pro každý prvek, a zobrazovat se pouze třídy s navazbenými prvky?
     * - Relevantní pouze pokud je parametr "filledRelationsOnly" v konfiguraci widgetu "SelectionResult" rovet "true".
     * - Nastavuje se pro každého uživatele zvlášť.
     * @default true
     */
    FilledRelationsOnly = "filled.relations.only",
    /**
     * - Konfigurace widgety query-table.
     * - Specifický widget pro SD.
     */
    FromData = "from.data.json",
    /**
     * - Nastavení hlaviček v tabulce.
     * - Tento klič lze rozšířit o specifikaci tabulky.
     */
    TableSettings = "table.settings.json",
    /**
     * - Parametr "Epocha" předávaný do ČÚZK služby při převodu souřadnic.
     * - Parametr se zadává v případě že je zvolen jako vstupní nebo výstupní CRS některý z WGS84 a nemá se použít aktuální datum. Požadovaný formát: dd.mm.rrrrr
     */
    CuzkTransformationEpocha = 'gdb.cuzk.epocha'
}

export default EDbRegistryKeys;