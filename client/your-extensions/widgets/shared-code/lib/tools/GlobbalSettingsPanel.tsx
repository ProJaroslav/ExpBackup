import { IMState, React, ReactRedux } from "jimu-core";
import { styled } from "jimu-theme";
import { getAppConfigAction } from "jimu-for-builder";
import { SettingSection, SettingRow } from "jimu-ui/advanced/setting-components";
import { TextInput, Switch, UrlInput, CollapsablePanel } from "jimu-ui";
import { EGlobalSettings, EKnownLayerExtension } from "widgets/shared-code/enums";
import { LayerHelper, GlobalSettingHelper } from "widgets/shared-code/helpers";

const StyledSettingSection = styled(SettingSection)`
    margin: 0 !important; 
    border: none !important;
    display: flex !important;
    padding: 10px !important;
    
    >div {
        >h6{
            color: white !important;
        }
    }
`;
const StyledSettingRow = styled(SettingRow)`
    >label {
        color: white !important;
    }
`;
const StyledCollapsablePanel = styled(CollapsablePanel)`
    max-height: 280px !important;
    overflow: auto !important;
    
    .title {
        color: white !important;
    } 
    .icon-btn-sizer {
        svg {
            path {
                fill: white !important;
            }
        }
    }
`;

/** - Globální nastavení napříč widgety. */
export default function() {
    ReactRedux.useSelector((state: IMState) => state.appConfig.attributes); // Kvůli rerendereru

    function changeExtensionValue(key: EKnownLayerExtension, value: string) {
        const serviceExtensions = GlobalSettingHelper.get("serviceExtensions").asMutable({ deep: true });
        const index = serviceExtensions.findIndex(extension => extension.key === key);

        if (index < 0) {
            serviceExtensions.push({ key, value });
        } else {
            serviceExtensions[index].value = value;
        }

        GlobalSettingHelper.set("serviceExtensions", serviceExtensions);
    }

    return <div> 
        <h6 style={{color: "white", padding: "15px 10px 0px 10px", margin: "0px"}}>Globální nastavení</h6>
        <StyledSettingSection>
            <StyledSettingSection>
                <StyledCollapsablePanel label="Obecné">
                    <StyledSettingRow label="Použít nastavení z DB registrů"/>
                    <SettingRow>
                        <Switch
                            checked={GlobalSettingHelper.get("globalSettings") === EGlobalSettings.DbRegistry}
                            onChange={(_, checked) => {
                                GlobalSettingHelper.set("globalSettings", checked ? EGlobalSettings.DbRegistry : EGlobalSettings.None)
                            }}
                        />
                    </SettingRow>
                    {
                        GlobalSettingHelper.get("globalSettings") === EGlobalSettings.DbRegistry ? <>
                            <StyledSettingRow label="Základ klíče v DB registrech"/>
                            <SettingRow>
                                <TextInput
                                    value={GlobalSettingHelper.get("bdRegistryKeyPrefix")}
                                    onChange={ev => {
                                        GlobalSettingHelper.set("bdRegistryKeyPrefix", ev.target.value);
                                    }}
                                />
                            </SettingRow>
                            <StyledSettingRow label="URI GetValue"/>
                            <SettingRow>
                                <TextInput
                                    value={GlobalSettingHelper.get("getDbRegistryValue")}
                                    onChange={ev => {
                                        GlobalSettingHelper.set("getDbRegistryValue", ev.target.value);
                                    }}
                                />
                            </SettingRow>
                            <StyledSettingRow label="URI SetValue"/>
                            <SettingRow>
                                <TextInput
                                    value={GlobalSettingHelper.get("setDbRegistryValue")}
                                    onChange={ev => {
                                        GlobalSettingHelper.set("setDbRegistryValue", ev.target.value);
                                    }}
                                />
                            </SettingRow>
                        </> : <></>
                    }
    
                    <StyledSettingRow label="Použít název služby(mapServiceName) při generování odkazu?"/>
                    <SettingRow>
                        <Switch
                            checked={GlobalSettingHelper.get("tokenMapServiceName")}
                            onChange={(_, checked) => {
                                GlobalSettingHelper.set("tokenMapServiceName", checked);
                            }}
                        />
                    </SettingRow>
    
                    <StyledSettingRow label="URL služby pro získání rolí uživatele"/>
                    <SettingRow>
                        <UrlInput
                            schemes={["https"]}
                            value={GlobalSettingHelper.get("permissionServiceUrl")}
                            onChange={ev => {
                                GlobalSettingHelper.set("permissionServiceUrl", ev.value);
                            }}
                        />
                    </SettingRow>
    
                    <StyledSettingRow label="Schovávat widgety na základě rolí uživatele?"/>
                    <SettingRow>
                        <Switch
                            checked={GlobalSettingHelper.get("checkPermissions")}
                            onChange={(_, checked) => {
                                GlobalSettingHelper.set("checkPermissions", checked);
                            }}
                        />
                    </SettingRow>
    
                    <StyledSettingRow label="Měnit DataSource mapového widgetu na základě URL parametrů?"/>
                    <SettingRow>
                        <Switch
                            checked={GlobalSettingHelper.get("environmentProcessor")}
                            onChange={(_, checked) => {
                                GlobalSettingHelper.set("environmentProcessor", checked);
                            }}
                        />
                    </SettingRow>
                </StyledCollapsablePanel>
            </StyledSettingSection>
            <StyledSettingSection>
                <StyledCollapsablePanel label="Názvy SOE">
                    <StyledSettingRow label="Relace"></StyledSettingRow>
                    <SettingRow>
                        <TextInput
                            value={LayerHelper.getExtensionValue(EKnownLayerExtension.RelationSoe)}
                            onChange={ev => {
                                changeExtensionValue(EKnownLayerExtension.RelationSoe, ev.target.value);
                            }}
                        />
                    </SettingRow>
                    <StyledSettingRow label="Databázový registr"></StyledSettingRow>
                    <SettingRow>
                        <TextInput
                            value={LayerHelper.getExtensionValue(EKnownLayerExtension.DbRegistrySoe)}
                            onChange={ev => {
                                changeExtensionValue(EKnownLayerExtension.DbRegistrySoe, ev.target.value);
                            }}
                        />
                    </SettingRow>
                    <StyledSettingRow label="Historie prvku"></StyledSettingRow>
                    <SettingRow>
                        <TextInput
                            value={LayerHelper.getExtensionValue(EKnownLayerExtension.HistorySoe)}
                            onChange={ev => {
                                changeExtensionValue(EKnownLayerExtension.HistorySoe, ev.target.value);
                            }}
                        />
                    </SettingRow>
                </StyledCollapsablePanel>
            </StyledSettingSection>
        </StyledSettingSection>
    </div>;
}