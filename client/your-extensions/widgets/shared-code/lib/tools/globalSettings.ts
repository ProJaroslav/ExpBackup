import { LayoutContextToolProps, extensionSpec, React, getAppStore } from "jimu-core";
import { ComponentClass, SVGAttributes } from "react";
import PlusOutlined from 'jimu-icons/svg/outlined/application/setting.svg';
import { GlobbalSettingsPanel } from "widgets/shared-code/tools";
import { GlobalSettingHelper } from "widgets/shared-code/helpers";

declare module 'jimu-core/lib/types/app-config'{
    interface AttributesJson {
        /** - Custom globální nastavení. */
        HSI_Setting: HSI.IHsiSetting;
    }
}

/** - Kontextové menu pro globální nastavení napříč widgety. */
export default class GlobbalSettings implements extensionSpec.ContextToolExtension {
    constructor() {
        this.setInitValue();
    }
    id = "global_settings";

    setInitValue() {
        const unsuscribe = getAppStore()
            .subscribe(() => {
                const appConfig = getAppStore().getState().appConfig;
                if (!!appConfig) {
                    unsuscribe();
                    if (!appConfig.attributes?.HSI_Setting) {
                        GlobalSettingHelper.setDefaultValue();
                    }
                }
            });
    }

    getGroupId() {
        return "global_settings";
    }
    getIcon(): ComponentClass<SVGAttributes<SVGElement>, any> {
        return PlusOutlined;
    };
    getTitle(props: LayoutContextToolProps) {
        return "Globální nastavení"
    }
    getSettingPanel(props: LayoutContextToolProps): ComponentClass<unknown, any> {
        return GlobbalSettingsPanel as any;
    }
    onClick(props: LayoutContextToolProps, evt?: React.MouseEvent<any, MouseEvent>): void {
        // const widgetId = props.layoutItem.widgetId
        // const widgetState = getAppStore().getState().widgetsState[widgetId]
    
        // getAppStore().dispatch(appActions.widgetStatePropChange(widgetId, 'isOpened', !widgetState?.isOpened));
    }
    // visible(props: LayoutContextToolProps) {
    //     return true;
    // };
    // checked(props: LayoutContextToolProps) {
    //     const widgetId = props.layoutItem.widgetId
    //     const widgetState = getAppStore().getState().widgetsState[widgetId]
    //     return widgetState?.isOpened;
    // };
    // disabled?: (props: LayoutContextToolProps) => boolean;
    // index?: number;
    // name?: string;
    // label?: string;
    // widgetId?: string;
    // destroy?: () => void;
}