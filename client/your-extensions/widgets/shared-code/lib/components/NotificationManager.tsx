import { getAppStore, IMState, React, ReactDOM, ReactRedux } from 'jimu-core';
import { Alert } from 'jimu-ui';
import { ENotificationActionKeys } from "widgets/shared-code/enums";
import { CalciteAlert } from '@esri/calcite-components-react';
import "./NotificationManager.scss";

export default React.memo(function() {
    const notificationPool = ReactRedux.useSelector((state: IMState) => state.hsiNotification.notificationPool);

    return ReactDOM.createPortal(<>
        {
            notificationPool.map(notification => {
                return <CalciteNotification key={notification.id} notification={notification} type={notificationPool[0].type} />;  
            })
        }
    </>, document.body);
    
    return ReactDOM.createPortal(<div
        id="notification-manager"
    >
        {
            notificationPool.map(notification => {
                return <Notification key={notification.id} notification={notification} />;  
            })
        }
    </div>, document.getElementById("app"));
});

function CalciteNotification({ notification, type }: ICalciteNotification) {
    return <CalciteAlert
        label='notification'
        autoClose
        autoCloseDuration='medium'
        open
        scale="l"
        onCalciteAlertClose={() => closeNotification(notification)}
        icon={function() {
            switch(type) {
                case "warning":
                case "error":
                    return "exclamation-mark-triangle";
                case "info":
                    return "information";
                case "success":
                    return "check-circle";
                default:
                    return true;
            }
        }()}
        kind={function(): "danger" | "success" | "info" | "warning" | "brand" {
            switch(type) {
                case "info":
                case "warning":
                case "success":
                    return type;
                case "error":
                    return "danger";
                default:
                    return "brand";
            }
        }()}
    >
        {
            typeof notification.title === "string" ? <div slot="title">{notification.title}</div> : <></>
        }
        {
            typeof notification.message === "string" ? <div slot="message">{notification.message}</div> : <></>
        }
    </CalciteAlert>;
}

function Notification({ notification }: { notification: HSI.NotificationStore.IAlertProps }) {
    // Notifikace se po 10s sama zavře
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            closeNotification(notification);
        }, 10000);

        return function() {
            clearTimeout(timeout);
        }
    }, [notification]);

    return <Alert
        closable
        onClose={() => closeNotification(notification)}
        open
        text={notification.message as string}
        type={notification.type}
        withIcon
    />;
}

function closeNotification(notification: Pick<HSI.NotificationStore.IAlertProps, "id">) {
    let action: HSI.NotificationStore.ICloseNotificationAction = {
        type: ENotificationActionKeys.Close,
        alertId: notification.id
    }

    getAppStore().dispatch(action);
}

interface ICalciteNotification extends Pick<HSI.NotificationStore.IAlertProps, "type"> {
    notification: Omit<HSI.NotificationStore.IAlertProps, "type">;
}