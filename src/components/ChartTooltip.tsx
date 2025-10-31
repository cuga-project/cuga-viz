const ChartTooltip = (props: any) => {
    const { active, payload } = props;

    if (active && payload && payload.length) {
        return (
            <div style={{background: 'black', padding: 10}}>
                <p className="label">{`${payload[0].name} : ${payload[0].value}`}</p>
                <p className="label">{`${payload[1].name} : ${payload[1].value}`}</p>
            </div>
        );
    }

    return null;
};

export default ChartTooltip