import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Info } from "lucide-react";

const Legend = () => {
  return (
    <Card className="absolute top-4 right-4 w-64 z-10 bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-sm">
          <Info size={16} className="mr-2" />
          Legend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div>
          <h4 className="font-semibold mb-1">Course Colors</h4>
          <p className="text-muted-foreground">
            Courses are colored based on your selection priority:
          </p>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            <li>• Course selection (highest priority)</li>
            <li>• Major selection</li>
            <li>• Degree selection (lowest priority)</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-1">Prerequisite Arrows</h4>
          <div className="space-y-1">
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-black mr-2"></div>
              <span className="text-muted-foreground">AND requirements</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-teal-300 mr-2"></div>
              <span className="text-muted-foreground">
                OR requirements (colored)
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-orange-500 mr-2"></div>
              <span className="text-muted-foreground">Highlighted path</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-1">Interactions</h4>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Click course to see details</li>
            <li>• Selected course highlights prerequisite paths</li>
            <li>• Toggle arrows on/off</li>
            <li>• Filter by degrees/majors/courses</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default Legend;
