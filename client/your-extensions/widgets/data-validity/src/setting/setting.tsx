import { React } from 'jimu-core';
import { type AllWidgetSettingProps } from 'jimu-for-builder';
import { Button, CollapsablePanel, TextInput, UrlInput } from 'jimu-ui';
import { WidgetSettingWrapper } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components';
import translations from "./translations/default";
import { ThemeColorPicker } from 'jimu-ui/basic/color-picker';
import { useTheme2 } from 'jimu-theme';
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash';

function Setting({ widgetId, onSettingChange, config }: AllWidgetSettingProps<HSI.DataValidityWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);
    const theme = useTheme2();

    return <>
        <SettingSection>
            <CollapsablePanel label={messageFormater("editRoles")}>
                <SettingRow>
                    <Button
                        size="sm"
                        onClick={() => {
                            onSettingChange({
                                id: widgetId,
                                config: config.set("editRoles", !config.editRoles ? [""] : config.editRoles.concat(""))
                            });
                        }}
                    >
                        {messageFormater("addRole")}
                    </Button>
                </SettingRow>
                {
                    !config.editRoles ? <></> : config.editRoles.asMutable().map((role, index) => {
                        return <SettingRow key={index}>
                            <TextInput
                                value={role}
                                onChange={ev => {
                                    const editRoles = config.editRoles.asMutable();
                                    editRoles[index] = ev.target.value;
                                    onSettingChange({
                                        id: widgetId,
                                        config: config.set("editRoles", editRoles)
                                    });
                                }}
                            />
                            <Button onClick={() => {
                                const editRoles = config.editRoles.asMutable();
                                editRoles.splice(index, 1);
                                onSettingChange({
                                    id: widgetId,
                                    config: config.set("editRoles", editRoles)
                                });
                            }}>
                                <TrashOutlined style={{ margin: 0 }}/>
                            </Button>
                        </SettingRow>;
                    })
                }
            </CollapsablePanel>
        </SettingSection>
    
    
        <SettingSection>
            <SettingRow label={messageFormater("getDataValidityUrl")}></SettingRow>
            <SettingRow>
                <UrlInput
                    schemes={["https"]}
                    value={config.getDataValidityUrl}
                    onChange={ev => {
                        onSettingChange({
                            id: widgetId,
                            config: config.set("getDataValidityUrl", ev.value)
                        });
                    }}
                />
            </SettingRow>
            <SettingRow label={messageFormater("setDataValidityUrl")}></SettingRow>
            <SettingRow>
                <UrlInput
                    schemes={["https"]}
                    value={config.setDataValidityUrl}
                    onChange={ev => {
                        onSettingChange({
                            id: widgetId,
                            config: config.set("setDataValidityUrl", ev.value)
                        });
                    }}
                />
            </SettingRow>
            <SettingRow label={messageFormater("textColor")}>
                <ThemeColorPicker
                    value={config.textColor}
                    specificTheme={theme}
                    onChange={color => {
                        onSettingChange({
                            id: widgetId,
                            config: config.set("textColor", color)
                        });
                    }}
                />
            </SettingRow>
        </SettingSection>
    </>;
}

export default WidgetSettingWrapper(Setting, { permissionSettings: true, ignoreJimuMapView: true });