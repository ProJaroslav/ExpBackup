import { React, LoadingType } from "jimu-core";
import { Loading } from "jimu-ui";
import "./Table.scss";

/** - Jednoduchá tabulka. */
export default function(props: ITableProps) {
    return <div className="hsi-table">
        <div className="hsi-table-wrapper">
            <table>
                { typeof props.caption === "string" ? <caption>{props.caption}</caption> : <></> }
                {
                    Array.isArray(props.header) ? 
                        <tr>
                            {
                                props.header.map((column, index) => {
                                    return <th key={index}>{column}</th>;
                                })
                            }
                        </tr>
                    : <></>
                }

                {
                    props.rows.map((row, index) => {
                        return <tr key={index}>
                            {
                                row.map((column, columnIndex) => {
                                    return <td key={`${index}-${columnIndex}`}>
                                        {column}
                                    </td>;
                                })
                            }
                        </tr>;
                    })
                }
            </table>
        </div>

        {
            props.loading ? <Loading type={LoadingType.Primary} className="hsi-table-loading" /> : <></>
        }
    </div>
}

interface ITableProps {
    /** - Hlavičky v tabulce. */
    header?: HSI.Table.ITableHeader;
    /** - Řádky v tabulce. */
    rows: HSI.Table.ITableRows;
    /** - Má se zobrazit načítání tabulky? */
    loading?: boolean;
    /** - Nadpis tabulky. */
    caption?: string | JSX.Element;
};