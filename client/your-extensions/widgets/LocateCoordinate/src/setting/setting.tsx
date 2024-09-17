import { React } from "jimu-core";
import { AllWidgetSettingProps } from "jimu-for-builder";
import { WidgetSettingWrapper } from "widgets/shared-code/components";
import { SettingSection, SettingRow } from "jimu-ui/advanced/setting-components";
import translations from "./translations/default";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { Switch } from "jimu-ui";

/**
 * - Hlavní komponenta nastavení widgetu.
 * - @see {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/}.
 */
function Setting(props: AllWidgetSettingProps<HSI.LocateCoordinateWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);

    return <SettingSection>
        <SettingRow label={messageFormater("forbidTransformGeometryByCuzk")}>
            <Switch
                checked={props.config.forbidTransformGeometryByCuzk}
                onChange={() => props.onSettingChange({ id: props.id, config: props.config.set("forbidTransformGeometryByCuzk", !props.config.forbidTransformGeometryByCuzk) })}
            />
        </SettingRow>
    </SettingSection>
}

export default WidgetSettingWrapper(Setting); 