import { React } from 'jimu-core';
import { Card, CardBody, CardFooter, Loading, LoadingType } from "jimu-ui";
import "./Card.scss";

export default function({ widgetName, children, className, footer, loading }: HSI.IWidgetBodyProps) {
    const fullClassName = `widget-${widgetName} hsi-widget-body${!className ? "" : ` ${className}`}`;
    if (loading) {
        return <Card className={fullClassName}>
            <CardBody>
                <Loading type={LoadingType.Primary} />
            </CardBody>
        </Card>
    }
    return <Card className={fullClassName}>
        <CardBody>{children}</CardBody>
        {!footer ? <></> : <CardFooter>{footer}</CardFooter>}
    </Card>
}