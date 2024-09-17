import { React } from "jimu-core";
import { AllWidgetSettingProps } from "jimu-for-builder";
import { SettingSection, SettingRow } from "jimu-ui/advanced/setting-components";
import { Switch, TextInput } from "jimu-ui";
import { WidgetSettingWrapper } from "widgets/shared-code/components";
import translations from "./translations/default";
import { useMessageFormater } from "widgets/shared-code/hooks";

/**
 * - Hlavní komponenta nastavení widgetu.
 * - @see {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/}.
 */
function Setting(props: AllWidgetSettingProps<HSI.SelectionResultWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);

    return <SettingSection>
        <SettingRow label={messageFormater("displayGrapgicTab")}>
            <Switch
                checked={props.config.displayGeometryTab}
                onChange={() => props.onSettingChange({ id: props.id, config: props.config.set("displayGeometryTab", !props.config.displayGeometryTab) })}
            />
        </SettingRow>
        <SettingRow label={messageFormater("editGeometryFromAttributeTab")}>
            <Switch
                checked={props.config.editGeometryFromAttributeTab}
                onChange={() => props.onSettingChange({ id: props.id, config: props.config.set("editGeometryFromAttributeTab", !props.config.editGeometryFromAttributeTab) })}
            />
        </SettingRow>
        <SettingRow label={messageFormater("forbidHistoryTab")}>
            <Switch
                checked={props.config.forbidHistoryTab}
                onChange={ev => props.onSettingChange({ id: props.id, config: props.config.set("displayHistoryTab", !props.config.forbidHistoryTab) })}
            />
        </SettingRow>
        <SettingRow label={messageFormater("forbidDocumentsTab")}>
            <Switch
                checked={props.config.forbidDocumentsTab}
                onChange={ev => props.onSettingChange({ id: props.id, config: props.config.set("displayDocumentTab", !props.config.forbidDocumentsTab) })}
            />
        </SettingRow>
        <SettingRow label={messageFormater("keepTreeState")}>
            <Switch
                checked={props.config.keepTreeState}
                onChange={() => props.onSettingChange({ id: props.id, config: props.config.set("keepTreeState", !props.config.keepTreeState) })}
            />
        </SettingRow>
        <SettingRow label={messageFormater("useTextArea")}>
            <Switch
                checked={!props.config.useTextInputs}
                onChange={() => props.onSettingChange({ id: props.id, config: props.config.set("useTextInputs", !props.config.useTextInputs) })}
            />
        </SettingRow>
        <SettingRow label={messageFormater("forbidEditing")}>
            <Switch
                checked={props.config.forbidEditing}
                onChange={() => props.onSettingChange({ id: props.id, config: props.config.set("forbidEditing", !props.config.forbidEditing) })}
            />
        </SettingRow>
        <SettingRow label={messageFormater("expandOnRightClick")}>
            <Switch
                checked={!props.config.forbidExpandLayerOnRightClick}
                onChange={() => props.onSettingChange({ id: props.id, config: props.config.set("forbidExpandLayerOnRightClick", !props.config.forbidExpandLayerOnRightClick) })}
            />
        </SettingRow>
        <SettingRow label={messageFormater("usePopupFormat")}>
            <Switch
                checked={!props.config.forbidtPopupFormat}
                onChange={() => props.onSettingChange({ id: props.id, config: props.config.set("forbidtPopupFormat", !props.config.forbidtPopupFormat) })}
            />
        </SettingRow>
        <SettingRow label={messageFormater("forbidEnableRelations")}>
            <Switch
                checked={props.config.forbidEnableRelations}
                onChange={ev => props.onSettingChange({ id: props.id, config: props.config.set("enableRelations",!props.config.forbidEnableRelations) })}
            />
        </SettingRow>
        <SettingRow label={messageFormater("filledOnly")}>
            <Switch
                checked={props.config.filledRelationsOnly}
                onChange={() => props.onSettingChange({ id: props.id, config: props.config.set("filledRelationsOnly", !props.config.filledRelationsOnly) })}
            />
        </SettingRow>
        <SettingRow label={messageFormater("forbidActionLinks")}>
            <Switch
                checked={props.config.forbidActionLinks}
                onChange={() => props.onSettingChange({ id: props.id, config: props.config.set("forbidActionLinks", !props.config.forbidActionLinks) })}
            />
        </SettingRow>
        <SettingRow label={messageFormater("dbRegistryConfigKey")}>
        </SettingRow>
        <SettingRow>
            <TextInput
                value={props.config.dbRegistryConfigKey}
                onChange={ev => props.onSettingChange({ id: props.id, config: props.config.set("dbRegistryConfigKey", ev.target.value) })}
            />
        </SettingRow>


    </SettingSection>;
}

export default WidgetSettingWrapper(Setting); 