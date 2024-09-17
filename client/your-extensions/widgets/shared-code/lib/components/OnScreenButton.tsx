import { IMIconResult, React, type AllWidgetProps } from "jimu-core";
import { Icon } from "jimu-ui"
import "./OnScreenButton.scss";

/** - Nastylované tlačítko po vzoru funkčních "onScreen" tlačítek v mapovém widgetu. */
export default function(props: IOnScreenButton) {

    // Přepsání stylu kontejneru widgetu (aby byly viďet stíny).
    React.useEffect(() => {
        try {
            if (props.widgetId) {
                const style = (document.querySelectorAll(`[data-widgetid="${props.widgetId}"]`).item(0) as HTMLDivElement).style;
                const originalState = style.overflow;
                style.overflow = "visible";

                return function() {
                    style.overflow = originalState;   
                }
            }
        } catch (e) { console.warn(e); }
    }, [props.widgetId]);
    
    return <div
        className={`widget-${props.name} hsi-onscreen-button esri-widget--button exbmap-ui-tool-shell${props.active ? " active" : ""}${props.disabled ? " disabled" : ""}`}
        title={props.title}
        onClick={!props.disabled && props.onClick}
    >
        <Icon icon={props.icon} />
    </div>;
}

interface IOnScreenButton extends Pick<AllWidgetProps<{}>, "widgetId">, Pick<AllWidgetProps<{}>['manifest'], "name"> {
    /** - Má být tlačítko podbarveno? */
    active?: boolean;
    /** - Má být zakázáno na tlačítko kliknout? */
    disabled?: boolean;
    /** - Ikona. */
    icon: string | IMIconResult;
    /** - Titulek. */
    title: string;
    /** - Funkce volajicí se při kliknutí na tlačítko. */
    onClick: (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}