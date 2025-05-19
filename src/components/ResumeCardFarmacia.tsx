import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

interface ResumeCardFarmaciaProps {
    farmacia: string;
    totalDia: number;
    DiferenciaDia: number;
}

const ResumeCardFarmacia = ({ farmacia, totalDia, DiferenciaDia }: ResumeCardFarmaciaProps) => {
    return (
            <Card>
                <CardHeader>
                    <CardTitle>{farmacia}</CardTitle>
                    <CardDescription></CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Venta del dia: {totalDia}</p>
                    <p>Diferencia: {DiferenciaDia}</p>
                </CardContent>
                <CardFooter>
                    <p>Pie de página de la tarjeta</p>
                </CardFooter>
            </Card>
    )
}

export default ResumeCardFarmacia