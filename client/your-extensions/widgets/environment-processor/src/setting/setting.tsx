import { React } from 'jimu-core';
import { type AllWidgetSettingProps } from 'jimu-for-builder';
import { Switch } from 'jimu-ui';
import { WidgetSettingWrapper } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components';
import translations from "./translations/default";
import Scales from "./components/Scales";
import Environments from "./components/Environments";

function Setting(props: AllWidgetSettingProps<HSI.EnvironmentProcessorWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);
    /**
     * - Funce pro změnu konfigurace.
     * @param key - Klíč {@link value hodnoty kterou měníme}.
     * @param value - Nová hodnota.
     */
    function updateConfig<T extends keyof typeof props.config>(key: T, value: typeof props.config[T]) {
        props.onSettingChange({ id: props.widgetId, config: props.config.set(key, value) });
    }

    return <>
        <SettingSection>
            <SettingRow label={messageFormater("validateEnvironment")}>
                <Switch
                    checked={props.config.validateEnvironment}
                    onChange={() => {
                        updateConfig("validateEnvironment", !props.config.validateEnvironment)
                    }}
                />
            </SettingRow>
            <SettingRow label={messageFormater("processDefaultEnvironment")}>
                <Switch
                    checked={props.config.processDefaultEnvironment}
                    onChange={() => {
                        updateConfig("processDefaultEnvironment", !props.config.processDefaultEnvironment)
                    }}
                />
            </SettingRow>
            <SettingRow label={messageFormater("preserveExtent")}>
                <Switch
                    checked={props.config.preserveExtent}
                    onChange={() => {
                        updateConfig("preserveExtent", !props.config.preserveExtent)
                    }}
                />
            </SettingRow>
        </SettingSection>

        <Scales
            updateConfig={updateConfig}
            config={props.config}
            widgetName={props.manifest.name}
        />

        <Environments
            updateConfig={updateConfig}
            config={props.config}
            widgetName={props.manifest.name}
        />
    </>;
}

export default WidgetSettingWrapper(Setting);