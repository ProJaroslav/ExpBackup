import { React } from 'jimu-core';
import { TextInput } from 'jimu-ui';
import { type AllWidgetSettingProps } from 'jimu-for-builder';
import { WidgetSettingWrapper } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components';
import translations from "./translations/default";
import { ColorPicker } from 'jimu-ui/basic/color-picker'

function Setting({ config, onSettingChange, widgetId }: AllWidgetSettingProps<HSI.RentTableWidget.IMConfig>) {
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

function TableSetting({ config, onSettingChange, widgetId }: AllWidgetSettingProps<HSI.RentTableWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);

    return <>
        <SettingRow label={messageFormater("landTypeTable")}>
            <TextInput
                className='w-50'
                onChange={ev => {
                    onSettingChange({
                        id: widgetId,
                        config: config.set("landTypeTable", ev.target.value)
                    });
                }}
                value={config.landTypeTable}
            />
        </SettingRow>
        <SettingRow label={messageFormater("katUzeTable")}>
            <TextInput
                className='w-50'
                onChange={ev => {
                    onSettingChange({
                        id: widgetId,
                        config: config.set("katUzeTable", ev.target.value)
                    });
                }}
                value={config.katUzeTable}
            />
        </SettingRow>
        <SettingRow label={messageFormater("renterTable")}>
            <TextInput
                className='w-50'
                onChange={ev => {
                    onSettingChange({
                        id: widgetId,
                        config: config.set("renterTable", ev.target.value)
                    });
                }}
                value={config.renterTable}
            />
        </SettingRow>
        <SettingRow label={messageFormater("rentTable")}>
            <TextInput
                className='w-50'
                onChange={ev => {
                    onSettingChange({
                        id: widgetId,
                        config: config.set("rentTable", ev.target.value)
                    });
                }}
                value={config.rentTable}
            />
        </SettingRow>
        <SettingRow label={messageFormater("parcelTable")}>
            <TextInput
                className='w-50'
                onChange={ev => {
                    onSettingChange({
                        id: widgetId,
                        config: config.set("parcelTable", ev.target.value)
                    });
                }}
                value={config.parcelTable}
            />
        </SettingRow>
    </>;
}

export default WidgetSettingWrapper(Setting, {
    permissionSettings: true,
    dynamicLayerSettings: true,
    dynamicLayerExtension: TableSetting
});