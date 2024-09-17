import { React, ReactDOM } from "jimu-core";
import { CalciteAction, CalciteActionMenu } from "@esri/calcite-components-react";
import { useForceUpdate } from "widgets/shared-code/hooks";
const { useEffect, useRef, useState } = React;

/**
 * - Tlčítko v hlavičce tabulky.
 * - Od ExB v 1.15 je to náhrada kontextového menu.
 */
export default function({ table, style, icon, children }: React.PropsWithChildren<HSI.FeatureTableComponent.ITableAction>) {
    if (!table) {
        return <></>;
    }
    
    return <TableAction table={table} style={style} icon={icon} >{children}</TableAction>;
}

function TableAction({ table, style, icon, children }: React.PropsWithChildren<HSI.FeatureTableComponent.ITableAction>) {
    const forceUpdate = useForceUpdate();
    const actionWrapper = function () {
        try {
            const container = typeof table.container === "string" ? document.getElementById(table.container) : table.container;
            return container.querySelector("calcite-panel")?.shadowRoot?.querySelector(".header-actions--end");
        } catch(err) {
            console.warn(err);
        }
    } ();

    // Rerendering dokud nebude existovat hlavička do které přidáme tlačítko
    useEffect(() => {
        if (!actionWrapper) {
            const interval = setInterval(forceUpdate, 100);
    
            return function() {
                clearInterval(interval);
            }
        }
    }, [actionWrapper, forceUpdate]);

    if (!actionWrapper) {
        return <></>;
    }

    return ReactDOM.createPortal(
        <CalciteActionMenu
            style={style}
            label="table-action"
            overlayPositioning="fixed"
            placement="bottom-end"
        >
            <CalciteAction
                text="Action Trigger"
                icon={icon}
                slot="trigger"
            />
                <slot name="header-menu-actions">
                    {children}
                </slot>
        </CalciteActionMenu>,
        actionWrapper
    );
}