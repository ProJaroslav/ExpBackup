import { ArcGISJSAPIModuleLoader, DbRegistryLoader, NotificationHelper, RequestHelper } from "widgets/shared-code/helpers";
import { EDbRegistryKeys } from "widgets/shared-code/enums";
import type { JimuMapView } from "jimu-arcgis";
import translations from "./translations/default";

/** - Třida pro ovládání FeatureTable. */
export default class FeatureTableHelper {
    private static _moduleLoader: ArcGISJSAPIModuleLoader<["TableTemplate", "FieldColumnTemplate", "ButtonMenuItem", "reactiveUtils", "Handles"]>;
    private static readonly _columnOrderParam = "order";

    /** - Poskytovatel ArcGIS modulů. */
    private static get ModuleLoader() {
        if (!FeatureTableHelper._moduleLoader) {
            FeatureTableHelper._moduleLoader = new ArcGISJSAPIModuleLoader(["TableTemplate", "FieldColumnTemplate", "ButtonMenuItem", "reactiveUtils", "Handles"]);
        }

        return FeatureTableHelper._moduleLoader;
    }

    /**
     * - Poskytuje HTML elementy hlavicěk sloupců v {@link table tabulce}.
     * - Hlavičky mají ve stylech šířku a pořadí sloupce.
     * @param table - Tabulka ze které získáváme elementy.
     */
    public static getTableColumns(table: __esri.FeatureTable): Array<HTMLTableCellElement> {
        const tableHead = table['grid']._grid.scrollTarget.getElementsByTagName("thead").item(0).firstElementChild as HTMLTableRowElement;
    
        const columns: Array<HTMLTableCellElement> = [];

        tableHead.childNodes.forEach((element: HTMLTableCellElement) => {
            if (element instanceof HTMLTableCellElement && !element.hasAttribute("frozen")) {
                columns.push(element);
            }
        });
    
        columns.sort((a, b) => parseInt(a.style.order) - parseInt(b.style.order));
    
        return columns;
    }
    
    /**
     * - Poskytuje název sloupce ke kterému přísluší {@link column HTML element hlavičky sloupce}.
     * @param table - Tabulka ze kterého sloupec pochází.
     * @param column - HTML element hlavičky sloupce ke kterému hledáme název sloupce.
     */
    public static getColumnName(table: __esri.FeatureTable, column: HTMLTableCellElement): string {
        const vaadinGrid = table['grid']._grid as HTMLElement;
    
        const gridContent = vaadinGrid.getElementsByTagName("vaadin-grid-cell-content");
    
        for (let index = 0; index < gridContent.length; index++) {
            let gridColumnCell = gridContent.item(index);
            if (gridColumnCell.getAttribute("slot") === column.getElementsByTagName("slot").item(0).name) {
                let gridColumn = gridColumnCell.getElementsByTagName("vaadin-grid-sorter");
                if (gridColumn.length > 0) {
                    return gridColumn.item(0).getAttribute("path");
                }
            }
        }
    }

    /**
     * - Poskytuje nastavení hlaviček tabulky.
     * @param jimuMapView - Aktivní view mapy.
     * @param nameExtension - Rozšíření klíče pod kterým je uloženo nastavení tabulky.
     */
    private static fetchDbRegistryValue(jimuMapView: JimuMapView, nameExtension: string) {
        if (!nameExtension || typeof nameExtension !== "string") {
            throw new Error(translations.nameExtensionIsRequired);
        }

        return DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.TableSettings, scope: "u", type: "json", nameExtension });
    }

    /**
     * - Uložení nastavení hlaviček {@link table tabulky}.
     * @param jimuMapView - Aktivní view mapy.
     * @param table - Tabulka jejíž nastavení ukládáme.
     * @param nameExtension - Rozšíření klíče pod kterým se ukládá nastavení tabulky.
     */
    private static async saveSettings(jimuMapView: JimuMapView, table: __esri.FeatureTable, nameExtension: string) {
        if (!nameExtension || typeof nameExtension !== "string") {
            throw new Error(translations.nameExtensionIsRequired);
        }

        const columns: HSI.DbRegistry.ITableSettingsDbValue['columns'] = [];

        table.columns
            .toArray()
            .sort((a, b) => FeatureTableHelper.getColumnOrder(a as __esri.FieldColumn) - FeatureTableHelper.getColumnOrder(b as __esri.FieldColumn))
            .forEach(column => {
                if ("fieldName" in column && "width" in column) {
                    columns.push({
                        fieldName: column.fieldName,
                        visible: !column['hidden'],
                        width: column.width
                    });
                }
            });

        return RequestHelper.setDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.TableSettings, scope: "u", type: "json", nameExtension, throwWhenSoeNotFound: true, value: { columns } });
    }

    /**
     * - Poskytuje template s aplikovaným nastavením sloupců tabulky
     * @param jimuMapView - Aktivní view mapy.
     * @param nameExtension - Rozšíření klíče pod kterým je uloženo nastavení tabulky.
     */
    public static async getSettingsBasedTemplate(jimuMapView: JimuMapView, nameExtension: string): Promise<__esri.TableTemplate> {
        const [response] = await Promise.all([
            FeatureTableHelper.fetchDbRegistryValue(jimuMapView, nameExtension),
            FeatureTableHelper.ModuleLoader.load()
        ]);

        if (Array.isArray(response?.columns)) {
            return new (FeatureTableHelper.ModuleLoader.getModule("TableTemplate"))({
                columnTemplates: response.columns.map(columnParams => {
                    return new (FeatureTableHelper.ModuleLoader.getModule("FieldColumnTemplate"))(columnParams);
                })
            });
        }
    }

    /**
     * - Přidává do tabulky tlačítko pro uložení nastavení hlaviček {@link table tabulky}.
     * @param jimuMapView - Aktivní view mapy.
     * @param table - Tabulka do které přidáváme tlačítko.
     * @param label - Label tlačítka.
     * @param nameExtension - Rozšíření klíče pod kterým se ukládá nastavení tabulky.
     */
    public static setSaveSettingsButton(jimuMapView: JimuMapView, table: __esri.FeatureTable, label: string, nameExtension: string): void {
        table.menuConfig = {
            items: [{
                label,
                icon: "save",
                clickFunction() {
                    FeatureTableHelper
                        .saveSettings(jimuMapView, table, nameExtension)
                        .catch(err => {
                            NotificationHelper.handleError(translations.failedToSaveTableSettings, err);
                        })
                        .then(() => {
                            NotificationHelper.addNotification({ type: "success", title: translations.saveTableSettingsSuccess });
                        });
                },
                hidden() {
                    return false;
                },
            }]
        };
    }

    /**
     * - Detekce změny ve sloupcích {@link table tabulky}.
     * @param table - Tabulka ne které sledujeme změny.
     * @param callback - Funkce volající se při změně ve sloupcích {@link table tabulky}.
     */
    public static async onColumnChange(table: __esri.FeatureTable, callback: () => void): Promise<__esri.Handles> {
        if (!FeatureTableHelper.ModuleLoader.isLoaded) {
            await FeatureTableHelper.ModuleLoader.load();
        }

        const handle = new (FeatureTableHelper.ModuleLoader.getModule("Handles"))();
        const reactiveUtils = FeatureTableHelper.ModuleLoader.getModule("reactiveUtils");

        handle.add([
            reactiveUtils.watch(() => table.columns.map(column => column), callback),
            reactiveUtils.watch(() => table.columns.map((column: __esri.FieldColumn) => column.fieldName), callback),
            reactiveUtils.watch(() => table.columns.map((column: __esri.FieldColumn) => column['hidden']), callback)
        ]);

        return handle;
    }

    /**
     * - Sleduje změny v pořadí a šířce sloupců v {@link table tabulce} a aktualizuje hodnotu v objektu {@link __esri.FieldColumn}.
     * @param table Tabulka ve které sledujeme změny.
     * @param callback - Volá se při změně pořadí nebo šířky sloupců. 
     */
    public static updateColumnsObservers(table: __esri.FeatureTable, callback: () => void): Array<MutationObserver> {
        const columnElements = FeatureTableHelper.getTableColumns(table);
        const observers: Array<MutationObserver> = [];
        columnElements.forEach(element => {
            let column = table.columns.find((column: __esri.FieldColumn) => column.fieldName === FeatureTableHelper.getColumnName(table, element)) as __esri.FieldColumn;
            if (!!column) {
                let onColumnChange = () => {
                    let hasChanged = FeatureTableHelper.setColumnOrder(column, element.style.order);

                    if (column.width !== element.style.width) {
                        column.width = element.style.width;
                        hasChanged = true;
                    }

                    if (hasChanged) {
                        callback();
                    }
                };

                onColumnChange();
                let observer = new MutationObserver(onColumnChange);

                observer.observe(element, { attributes: true, attributeFilter: ["style"] });

                observers.push(observer);
            }
        });

        return observers;
    }

    /**
     * - Nastavení pořadí {@link column sloupce} v tabulce.
     * @param column - Sloupec u kterého nastavujeme pořadí.
     * @param value - Pořadí {@link column sloupce}.
     * @returns Došlo ke změně hodnoty?
     */
    public static setColumnOrder(column: __esri.FieldColumn, value: string | number): boolean {
        if (FeatureTableHelper.getColumnOrder(column) !== value) { 
            column.set(FeatureTableHelper._columnOrderParam, value);
            return true;
        }
        return false;
    }

    /**
     * - Podkytuje pořadí {@link column sloupce} v tabulce.
     * @param column - Sloupec u kterého hledáme pořadí.
     */
    public static getColumnOrder(column: __esri.FieldColumn): number | undefined {
        const order = column.get(FeatureTableHelper._columnOrderParam);
        return typeof order === "string" ? parseInt(order) : typeof order === "number" ? order : undefined;
    }

    /**
     * - Naslouchání na změnu výběru v {@link table tabulce}.
     * @param table - Tabulka u které hlídáme změnu výběru.
     * @param callback - Funkce volající se při změně výběru.
     */
    public static onSelectListeners(table: __esri.FeatureTable, callback: () => void) {
        callback();
        return [
            table.highlightIds.on("after-changes", callback)
        ];
    }

    public static onTableStateChange(table: __esri.FeatureTable, callback: (state: __esri.FeatureTable['state']) => void): __esri.WatchHandle {
        callback(table.state);
        return table.watch("state", callback);
    }
}