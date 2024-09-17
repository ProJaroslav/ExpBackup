import { React, type AllWidgetProps } from "jimu-core";
import { Button, Loading, LoadingType, Tooltip, TextInput, ButtonGroup } from "jimu-ui";
import { useTheme } from "jimu-theme";
import { WidgetWrapper } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { GeometryHelper, NotificationHelper, RequestHelper, DateHelper } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";
import translations from "./translations/default";
import { WidgetEditorOutlined } from 'jimu-icons/outlined/brand/widget-editor';
import { CloseRectangleOutlined } from 'jimu-icons/outlined/editor/close-rectangle';
import { SaveOutlined } from 'jimu-icons/outlined/application/save';
import "./widget.scss";

const { useState, useEffect } = React;

function Widget({ manifest, config }: AllWidgetProps<HSI.DataValidityWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);
    const [state, setState] = useState<HSI.DataValidityWidget.IState>({ validityState: ELoadStatus.Pending });
    const theme = useTheme();
    const textColor = GeometryHelper.getColor(config.textColor);

    useEffect(() => {
        const abortController = new AbortController();
        setState({ validityState: ELoadStatus.Pending });

        (async function() {
            try {

                // const [{ GetDataValidityResult }, { UserRoles }] = await Promise.all([
                //     fetch(config.getDataValidityUrl, { signal: abortController.signal } )
                //         .then(response => response.json() as Promise<{ GetDataValidityResult: { Items: HSI.DataValidityWidget.IStateEditing['dataValidity']; }; }>),
                //     RequestHelper.providePermissions()
                // ]);

                const { UserRoles } = await RequestHelper.providePermissions();

                const GetDataValidityResult: { Items: HSI.DataValidityWidget.IStateEditing['dataValidity']; } = await new Promise(res => setTimeout(() => res({
                    "Items": [
                        {
                            "Aktualnost": "\/Date(1575414000000+0100)\/",
                            "Dul": "DNT"
                        },
                        {
                            "Aktualnost": "\/Date(1575586800000+0100)\/",
                            "Dul": "DB"
                        }
                    ]
                }), 3000));

                if (!abortController.signal.aborted) {
                    setState({ validityState: ELoadStatus.Loaded, dataValidity: GetDataValidityResult.Items, UserRoles, isEditing: false });
                }
            } catch(err) {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                    setState({ validityState: ELoadStatus.Error });
                    NotificationHelper.handleError(messageFormater("failedToLoadValidity"), err);
                }
            }
        })();

        return function() {
            abortController.abort();
        }
    }, [setState, config.getDataValidityUrl]);

    function getDate(mineKey: HSI.DataValidityWidget.IDataValidity['Dul']): JSX.Element {
        if (!mineKey || state.validityState !== ELoadStatus.Loaded)
            return <></>;

        const value = (state.isEditing ? state.editValues : state.dataValidity).find(({ Dul }) => Dul === mineKey)?.Aktualnost
        if (!value)
            return <></>;

        const date = new Date(DateHelper.dateStringToMiliseconds(value));

        if (state.isEditing) {
            return <TextInput
                size="sm"
                type="date"
                value={DateHelper.inputFormat(date)}
                onChange={ev => {
                    setState((state: HSI.DataValidityWidget.IStateEditing) => ({
                        validityState: ELoadStatus.Loaded,
                        isEditing: true,
                        UserRoles: state.UserRoles,
                        dataValidity: state.dataValidity,
                        isSaving: false,
                        editValues: state.editValues.map((validity): HSI.DataValidityWidget.IStateEditing['editValues'][number] => {
                            if (validity.Dul !== mineKey) {
                                return validity;
                            }

                            return {
                                Aktualnost: DateHelper.toDateString(DateHelper.toLocaleTime(ev.target.value)),
                                Dul: validity.Dul
                            };
                        }) as HSI.DataValidityWidget.IStateEditing['editValues']
                    }));
                }}
            />;
        }

        const month = date.getMonth() + 1;
        const day = date.getDate();

        return <span>{day < 10 ? "0" : ""}{day}.{month < 10 ? "0" : ""}{month}.{date.getFullYear()}</span>;
    }

    /** - Uložení změn platnosti dat. */
    async function save() {
        try {
            if (state.validityState === ELoadStatus.Loaded && state.isEditing) {
                setState((currentState: HSI.DataValidityWidget.IStateEditing) => ({
                    validityState: currentState.validityState,
                    dataValidity: currentState.dataValidity,
                    isEditing: true,
                    editValues: currentState.editValues,
                    isSaving: true,
                    UserRoles: currentState.UserRoles
                }));
    
                await fetch(config.setDataValidityUrl, {
                    method: "post",
                    body: JSON.stringify({
                        dbAktualnost: state.editValues.find(({ Dul }) => Dul === 'DB')?.Aktualnost,
                        dntAktualnost: state.editValues.find(({ Dul }) => Dul === 'DNT')?.Aktualnost
                    })
                }).then(res => res.json());
    
                setState((currentState: HSI.DataValidityWidget.IStateEditing) => ({
                    validityState: currentState.validityState,
                    dataValidity: currentState.editValues,
                    isEditing: false,
                    UserRoles: currentState.UserRoles
                }));
            }
        } catch(err) {
            console.warn(err);
            NotificationHelper.handleError(messageFormater("failedToSave"), err);
            setState((currentState: HSI.DataValidityWidget.IStateEditing) => ({
                validityState: currentState.validityState,
                dataValidity: currentState.dataValidity,
                isEditing: true,
                editValues: currentState.editValues,
                isSaving: false,
                UserRoles: currentState.UserRoles
            }));
        }
    }

    return <div className={`widget-${manifest.name}`} style={{ color: textColor }}>
        {
            function(){
                switch(state.validityState) {
                    case ELoadStatus.Pending:
                        return <>{messageFormater("loadingValidity")}<Loading type={LoadingType.DotsPrimary} theme={{ ...theme, colors: { ...theme.colors, primary: textColor, palette: { ...theme.colors.palette, primary: { ...theme.colors.palette.primary, 100: textColor, 200: textColor, 300: textColor, 400: textColor, 500: textColor, 600: textColor, 700: textColor, 800: textColor, 900: textColor  }  } } }} /></>;
                    case ELoadStatus.Error:
                        return messageFormater("failedToLoadValidity");
                    case ELoadStatus.Loaded:
                        const dataValidity = <>
                            <span>{messageFormater("dateValidity")}</span>&nbsp;
                            <span>{messageFormater("dnt")}</span>&nbsp;
                            {getDate("DNT")}&nbsp;
                            <span>{messageFormater("db")}</span>&nbsp;
                            {getDate("DB")}
                        </>;

                        if (!config.editRoles.some(role => state.UserRoles.includes(role))) {
                            return dataValidity;
                        }

                        return <>
                            {dataValidity}&nbsp;
                            {
                                function() {
                                    if (!state.isEditing) {
                                        return <Tooltip title={messageFormater("editButton")} >
                                            <Button
                                                size="sm"
                                                icon
                                                onClick={() => {
                                                    setState((currentState: HSI.DataValidityWidget.IStateLoaded<false>) => ({
                                                        dataValidity: currentState.dataValidity,
                                                        isEditing: true,
                                                        UserRoles: currentState.UserRoles,
                                                        validityState: currentState.validityState,
                                                        editValues: currentState.dataValidity,
                                                        isSaving: false
                                                    }))
                                                }}
                                            >
                                                <WidgetEditorOutlined/>
                                            </Button>
                                        </Tooltip>;
                                    }

                                    return <ButtonGroup size="sm">
                                        <Tooltip title={messageFormater("save")} >
                                            <Button
                                                icon
                                                onClick={save}
                                            >
                                                <SaveOutlined/>
                                            </Button>
                                        </Tooltip>

                                        <Tooltip title={messageFormater("cancel")} >
                                            <Button
                                                icon
                                                type="danger"
                                                onClick={() => {
                                                    setState((currentState: HSI.DataValidityWidget.IStateEditing) => ({
                                                        isEditing: false,
                                                        dataValidity: currentState.dataValidity,
                                                        UserRoles: currentState.UserRoles,
                                                        validityState: currentState.validityState
                                                    }))
                                                }}
                                            >
                                                <CloseRectangleOutlined/>
                                            </Button>
                                        </Tooltip>
                                    </ButtonGroup>;
                                }()
                            }
                            
                        </>;
                }
            }()
        }
    </div>;
}

export default WidgetWrapper(Widget, { ignoreJimuMapView: true });