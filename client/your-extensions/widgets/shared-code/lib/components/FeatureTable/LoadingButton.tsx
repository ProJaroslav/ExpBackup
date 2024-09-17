import { React } from "jimu-core";
import { Button, type ButtonProps, Loading, LoadingType } from "jimu-ui";
import "./LoadingButton.scss";

export default function({ children, loading, className, ...props}: ButtonProps & { loading: boolean; }) {
    return <Button
        {...props}
        className={`hsi-loading-button${!!className ? ` ${className}` : ""}`}
    >
        {loading ? <Loading type={props.type === "primary" ? LoadingType.DotsSecondary : LoadingType.DotsPrimary} /> : <></>}
        {children}
    </Button>;
}