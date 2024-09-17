import { React } from 'jimu-core';
import { Button, CollapsablePanel, TextInput, UrlInput } from 'jimu-ui';
import { type AllWidgetSettingProps } from 'jimu-for-builder';
import { WidgetSettingWrapper } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components';
import { ColorPicker } from 'jimu-ui/basic/color-picker'
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash';
import translations from "./translations/default";

function Setting({ config, onSettingChange, widgetId }: AllWidgetSettingProps<HSI.QueriesTableWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);

    return <>
        <SettingSection>
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
        </SettingSection>
        <SettingSection>
            <CollapsablePanel label={messageFormater("whitelistLabel")}>
                <SettingRow>
                    <Button
                        size="sm"
                        onClick={() => {
                            onSettingChange({
                                id: widgetId,
                                config: config.set("objectClassWhiteList", !config.objectClassWhiteList ? [""] : config.objectClassWhiteList.concat(""))
                            });
                        }}
                    >
                        {messageFormater("addQuery")}
                    </Button>
                </SettingRow>
                {
                    config.objectClassWhiteList?.map((query, index) => {
                        return <SettingRow key={index}>
                            <TextInput
                                value={query}
                                onChange={ev => {
                                    const queryWhiteList = config.objectClassWhiteList.asMutable();
                                    queryWhiteList[index] = ev.target.value;
                                    onSettingChange({
                                        id: widgetId,
                                        config: config.set("objectClassWhiteList", queryWhiteList)
                                    });
                                }}
                            />
                            <Button
                                icon
                                onClick={() => {
                                    const queryWhiteList = config.objectClassWhiteList.asMutable();
                                    queryWhiteList.splice(index, 1);
                                    onSettingChange({
                                        id: widgetId,
                                        config: config.set("objectClassWhiteList", queryWhiteList)
                                    });
                                }}
                            >
                                <TrashOutlined/>
                            </Button>
                        </SettingRow>;
                    })
                }
            </CollapsablePanel>
        </SettingSection>
    </>;
}

export default WidgetSettingWrapper(Setting, { permissionSettings: true, dynamicLayerSettings: true });