import { React } from 'jimu-core';
import { type AllWidgetSettingProps } from 'jimu-for-builder';
import { SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components';
import { ColorPicker } from 'jimu-ui/basic/color-picker';
import { WidgetSettingWrapper } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import translations from "./translations/default";
import { UrlInput } from 'jimu-ui';

function Setting({ onSettingChange, widgetId, config }: AllWidgetSettingProps<HSI.LandTableWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);
    
    return <SettingSection>
        <SettingRow label={messageFormater("highlight")}>
            <ColorPicker
                color={config.highlightColor}
                onChange={color => {
                    onSettingChange({
                        id: widgetId,
                        config: config.set("highlightColor", color)
                    });
                }}
            />
        </SettingRow>

        <SettingRow label={messageFormater("buildingCuzkUrl")}></SettingRow>
        <SettingRow>
            <UrlInput
                schemes={["https"]}
                onChange={res => {
                    onSettingChange({
                        id: widgetId,
                        config: config.set("buildingCuzkUrl", res.value)
                    });
                }}
                value={config.buildingCuzkUrl}
            />
        </SettingRow>

        <SettingRow label={messageFormater("parcelCuzkUrl")}></SettingRow>
        <SettingRow>
            <UrlInput
                schemes={["https"]}
                onChange={res => {
                    onSettingChange({
                        id: widgetId,
                        config: config.set("parcelCuzkUrl", res.value)
                    });
                }}
                value={config.parcelCuzkUrl}
            />
        </SettingRow>
    </SettingSection>;
}

export default WidgetSettingWrapper(Setting, { permissionSettings: true });