import { React } from "jimu-core";
import { TextInput, Switch } from "jimu-ui";
import { AllWidgetSettingProps } from "jimu-for-builder";
import { SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components';
import translations from "./translations/default";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { EConstants } from "widgets/shared-code/enums";
import { WidgetSettingWrapper } from "widgets/shared-code/components";
import IConfig from "../IConfig";

/**
 * - Hlavní komponenta nastavení widgetu.
 * - @see {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/}.
 */
function Setting(props: AllWidgetSettingProps<IConfig>) {
    const messageFormater = useMessageFormater(translations);

    return (
        <>
            <SettingSection title={messageFormater("settingKey")}>
                <SettingRow>
                    <TextInput
                        value={props.config[EConstants.tocSettingKey]}
                        onChange={ev => props.onSettingChange({ id: props.id, config: props.config.set(EConstants.tocSettingKey, ev.target.value) })}
                    />
                </SettingRow>
            </SettingSection>
            <SettingSection title={messageFormater("enableLegend")}>
                <Switch
                    checked={props.config["enableLegend"]}
                    onChange={(evt, checked) => props.onSettingChange({ id: props.id, config: props.config.set("enableLegend", checked) })}
                />
            </SettingSection>
        </>
    );
}

export default WidgetSettingWrapper(Setting); 