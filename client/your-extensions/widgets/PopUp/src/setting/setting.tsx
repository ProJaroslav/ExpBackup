import { React } from "jimu-core";
import { Switch, TextInput } from "jimu-ui";
import { AllWidgetSettingProps } from "jimu-for-builder";
import { SettingSection, SettingRow } from "jimu-ui/advanced/setting-components";
import { WidgetSettingWrapper } from "widgets/shared-code/components"
import { useMessageFormater } from  "widgets/shared-code/hooks";
import translations from "./translations/default";

/**
 * - Hlavní komponenta nastavení widgetu.
 * - @see {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/}.
 */
function Setting(props: AllWidgetSettingProps<HSI.PopUpWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);

    return <>
        <SettingSection>
            <SettingRow label={messageFormater("hidden")}>
                <Switch
                    checked={props.config.hideButton}
                    onClick={() => props.onSettingChange({ id: props.id, config: props.config.set("hideButton", !props.config.hideButton) })}
                />
            </SettingRow>
        </SettingSection>
        <SettingSection>
            <SettingRow label={messageFormater("hideGenerateUrlButton")}>
                <Switch
                    checked={props.config.hideGenerateUrlButton}
                    onClick={() => props.onSettingChange({ id: props.id, config: props.config.set("hideGenerateUrlButton", !props.config.hideGenerateUrlButton) })}
                />
            </SettingRow>
        </SettingSection>
        <SettingSection title={messageFormater("settingKey")}>
        <SettingRow>
            <TextInput
                value={props.config.dbRegistryConfigKeyExtension}
                onChange={ev => props.onSettingChange({ id: props.id, config: props.config.set("dbRegistryConfigKeyExtension", ev.target.value) })}
            />
        </SettingRow>
    </SettingSection>
    </>;
}

export default WidgetSettingWrapper(Setting); 