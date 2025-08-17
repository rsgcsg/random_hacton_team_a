import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Info, X } from "lucide-react";

const Legend = () => {
  const [open, setOpen] = useState(true)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-card/90 backdrop-blur-sm shadow-md hover:bg-card"
      >
        <Info size={20} />
      </button>
    )
  }

  return (
    <Card className="absolute top-4 right-4 w-64 z-10 bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-2 flex justify-between items-center">
        <CardTitle className="flex items-center text-sm">
          <Info size={16} className="mr-2" />
          Legend
        </CardTitle>
        <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted">
          <X size={16} />
        </button>
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
          <p className="text-muted-foreground">
            If a course is in multiple programs, show the colour of all the programs
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-1">Prerequisite Arrows</h4>
          <div className="space-y-1">
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-black mr-2"></div>
              <span className="text-muted-foreground">The prerequisites must be satisfied</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-teal-300 mr-2"></div>
              <span className="text-muted-foreground">
                OR requirements (colored)
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-orange-500 mr-2"></div>
              <span className="text-muted-foreground">Highlighted path of a particular course you selected</span>
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
