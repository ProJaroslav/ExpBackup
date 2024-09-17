import { React } from 'jimu-core';
import { type AllWidgetSettingProps } from 'jimu-for-builder';
import { WidgetSettingWrapper } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { Button, CollapsablePanel, TextInput } from 'jimu-ui';
import { SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components';
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash';
import translations from "./translations/default";

function Setting({ config, widgetId, onSettingChange }: AllWidgetSettingProps<HSI.LandReportWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);

    return <SettingSection>
        <CollapsablePanel label={messageFormater("whitelistLabel")}>
        <SettingRow>
            <Button
                size="sm"
                onClick={() => {
                    onSettingChange({
                        id: widgetId,
                        config: config.set("queryWhiteList", !config.queryWhiteList ? [""] : config.queryWhiteList.concat(""))
                    });
                }}
            >
                {messageFormater("addQuery")}
            </Button>
        </SettingRow>
        {
            config.queryWhiteList.map((query, index) => {
                return <SettingRow key={index}>
                    <TextInput
                        value={query}
                        onChange={ev => {
                            const queryWhiteList = config.queryWhiteList.asMutable();
                            queryWhiteList[index] = ev.target.value;
                            onSettingChange({
                                id: widgetId,
                                config: config.set("queryWhiteList", queryWhiteList)
                            });
                        }}
                    />
                    <Button
                        icon
                        onClick={() => {
                            const queryWhiteList = config.queryWhiteList.asMutable();
                            queryWhiteList.splice(index, 1);
                            onSettingChange({
                                id: widgetId,
                                config: config.set("queryWhiteList", queryWhiteList)
                            });
                        }}
                    >
                        <TrashOutlined/>
                    </Button>
                </SettingRow>;
            })
        }
        </CollapsablePanel>
    </SettingSection>;
}

export default WidgetSettingWrapper(Setting, { permissionSettings: true });