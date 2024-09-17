import { React } from "jimu-core";
import { Label, TextInput, Select, Option } from "jimu-ui";
import { SelectFilter } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import translations from "../translations/default";

const { useState, useEffect, useMemo } = React;

/** - Výběr vyhledávacích parametrů pronájmu pozemku. */
export default function ({ katUzeFeatureSet, landTypeFeatureSet, renterFeatureSet, searchButtonRef, tableRef }: HSI.RentTableWidget.ISearchParams) {
    const messageFormater = useMessageFormater(translations);
    const [parcelNo, setParcelNo] = useState<string>("");
    const [katUze, setKatUze] = useState<number>();
    const [landType, setLandType] = useState<number>();
    const [rent, setRent] = useState<number>();

    useEffect(() => {
        function listener(ev: HTMLElementEventMap["click"]) {
            const definitionExpression: Array<string> = [];
            if (!!parcelNo) {
                definitionExpression.push(`PARCISLO='${parcelNo}'`);
            }
            if (!!katUze) {
                definitionExpression.push(`KOD_KU=${katUzeFeatureSet.features.find(feature => feature.getObjectId() === katUze).getAttribute("KOD")}`);
            }
            if (!!landType) {
                definitionExpression.push(`DRUPOZ_KOD=${landTypeFeatureSet.features.find(feature => feature.getObjectId() === landType).getAttribute("KOD")}`);
            }
            if (!!rent) {
                definitionExpression.push(`NAJEMCE_ID=${rent}`);
            }

            if (!!tableRef.current) {
                tableRef.current.layer.definitionExpression = definitionExpression.length > 0 ? definitionExpression.join(" AND ") : "1=1";
            }
        }
        if (!!searchButtonRef.current) {
            searchButtonRef.current.addEventListener("click", listener);
        }
        return function() {
            if (!!searchButtonRef.current) {
                searchButtonRef.current.removeEventListener("click", listener);
            }
        }
    })

    const katUzeOptions = useMemo(() => {
        return katUzeFeatureSet.features
            .map<HSI.SelectFilter.ISelectFilterOption>(feature => ({
                value: feature.getObjectId(),
                label: feature.getAttribute("NAZEV")
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [katUzeFeatureSet]);

    const katUzeCodeOptions = useMemo(() => {
        return katUzeFeatureSet.features
            .map<HSI.SelectFilter.ISelectFilterOption>(feature => ({
                value: feature.getObjectId(),
                label: feature.getAttribute("KOD").toString()
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [katUzeFeatureSet]);

    const renterOptions = useMemo(() => {
        return renterFeatureSet.features
            .map<HSI.SelectFilter.ISelectFilterOption>(feature => ({
                value: feature.getObjectId(),
                label: feature.getAttribute("NAZEV_NAJEMCE")
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [renterFeatureSet]);

    return <>
        <Label for="kat-uze">
            {messageFormater("katUzeLabel")}
        </Label>
        <SelectFilter
            options={katUzeOptions}
            nullable
            selectProps={{
                id: "kat-uze",
                size: "sm",
                value: katUze,
                onChange(evt) {
                    setKatUze(evt.target.value);
                }
            }}
        />
        <Label for="kat-uze-code">
            {messageFormater("katUzeCodeLabel")}
        </Label>
        <SelectFilter
            options={katUzeCodeOptions}
            nullable
            selectProps={{
                id: "kat-uze-code",
                size: "sm",
                value: katUze,
                onChange(evt) {
                    setKatUze(evt.target.value);
                }
            }}
        />
        <Label for="parcel-no">
            {messageFormater("parcelNo")}
        </Label>
        <TextInput
            id="parcel-no"
            size="sm"
            value={parcelNo}
            onChange={(evt) => {
                setParcelNo(evt.target.value);   
            }}
        />
        <Label for="land-type">
            {messageFormater("landType")}
        </Label>
        <Select
            id="land-type"
            size="sm"
            value={landType}
            onChange={(evt) => {
                setLandType(evt.target.value);   
            }}
        >
            { !!landType ? <Option value={null}>{messageFormater("emptyParcelTypeValue")}</Option> : <></> }
            {
                landTypeFeatureSet
                    .features
                    .sort((a, b) => (a.getAttribute("NAZEV") as string).localeCompare(b.getAttribute("NAZEV")))
                    .map(feature => {
                        return <Option key={feature.getObjectId()} value={feature.getObjectId()}>{feature.getAttribute("NAZEV")}</Option>;
                    })
            }
        </Select>
        <Label for="rent">
            {messageFormater("rent")}
        </Label>
        <SelectFilter
            options={renterOptions}
            nullable
            selectProps={{
                id: "rent",
                size: "sm",
                value: rent,
                onChange(evt) {
                    setRent(evt.target.value);
                }
            }}
        />
    </>;

}