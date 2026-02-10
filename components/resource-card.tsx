"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Resource } from "@/store/resources-store";
import { Download, FileText } from "lucide-react";

interface ResourceCardProps {
  resource: Resource;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = resource.fileUrl;
    link.download = `${resource.title}.${resource.fileType}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <FileText className="h-5 w-5 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg line-clamp-2">
              {resource.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {resource.courseName}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {resource.description}
        </p>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {resource.downloadCount?.toLocaleString()} downloads
          </span>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded capitalize">
            {resource.fileType}
          </span>
        </div>

        <Button
          onClick={handleDownload}
          className="w-full bg-gradient-to-r from-primary-500 to-secondary-400 hover:from-primary-700 hover:to-secondary-500"
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </CardContent>
    </Card>
  );
}
