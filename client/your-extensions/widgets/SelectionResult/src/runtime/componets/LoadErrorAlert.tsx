import { React } from "jimu-core";
import { Alert } from "jimu-ui";
import { ELoadStatus } from "widgets/shared-code/enums";

/** - . */
export default function(props: ILoadErrorAlertProps) {
    /** - Stav načtení relačních tříd pro tento {@link props.gisId prvek}. */
    const loadedRelationClass = props.loadedRelationClasses[props.gisId];

    if (loadedRelationClass?.state === ELoadStatus.Error) {
        return <Alert
            className="load-relation-class-error-alert"
            form="tooltip"
            type="error"
            text={loadedRelationClass.errorMessage}
            size="small"
        />;
    }

    return <></>;
};

interface ILoadErrorAlertProps extends Pick<HSI.SelectionResultWidget.ITreeItemCommonProps, "loadedRelationClasses"> {
    gisId: string;
}