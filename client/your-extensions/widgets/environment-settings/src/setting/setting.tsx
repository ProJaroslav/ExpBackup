import { React } from 'jimu-core';
import { type AllWidgetSettingProps } from 'jimu-for-builder';
import { WidgetSettingWrapper } from "widgets/shared-code/components";

function Setting(props: AllWidgetSettingProps<HSI.EnvironmentSettingsWidget.IMConfig>) {
    return <></>;
}

export default WidgetSettingWrapper(Setting, { permissionSettings: true });