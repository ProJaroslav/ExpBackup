import { React } from 'jimu-core';
import { TextInput } from 'jimu-ui';
import { type AllWidgetSettingProps } from 'jimu-for-builder';
import { WidgetSettingWrapper } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components';
import translations from "./translations/default";
import { ColorPicker } from 'jimu-ui/basic/color-picker'

function Setting({ config, onSettingChange, widgetId }: AllWidgetSettingProps<HSI.PropertyReportTableWidget.IMConfig>) {
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
    </SettingSection>;
}

export default WidgetSettingWrapper(Setting, { permissionSettings: true, dynamicLayerSettings: true, dynamicLayerExtension: Table });

function Table({ config, onSettingChange, widgetId }: AllWidgetSettingProps<HSI.PropertyReportTableWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);

    return <>
        <SettingRow label={messageFormater("reportTable")}>
            <TextInput
                className='w-50'
                value={config.reportTable}
                onChange={ev => {
                    onSettingChange({
                        config: config.set("reportTable", ev.target.value),
                        id: widgetId
                    });
                }}
            />
        </SettingRow>
        <SettingRow label={messageFormater("differenceTable")}>
            <TextInput
                className='w-50'
                value={config.differenceTable}
                onChange={ev => {
                    onSettingChange({
                        config: config.set("differenceTable", ev.target.value),
                        id: widgetId
                    });
                }}
            />
        </SettingRow>
        <SettingRow label={messageFormater("sapTable")}>
            <TextInput
                className='w-50'
                value={config.sapTable}
                onChange={ev => {
                    onSettingChange({
                        config: config.set("sapTable", ev.target.value),
                        id: widgetId
                    });
                }}
            />
        </SettingRow>
        <SettingRow label={messageFormater("sapField")}>
            <TextInput
                className='w-50'
                value={config.sapField}
                onChange={ev => {
                    onSettingChange({
                        config: config.set("sapField", ev.target.value),
                        id: widgetId
                    });
                }}
            />
        </SettingRow>
    </>;
}