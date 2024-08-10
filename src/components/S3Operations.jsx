import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchS3Files, uploadFile, removeFile } from "../api/s3";

const S3Operations = ({ customerName }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);

  const { data: s3Files, refetch: refetchS3Files } = useQuery({
    queryKey: ["s3Files", customerName],
    queryFn: () => fetchS3Files(customerName),
  });

  const uploadMutation = useMutation({
    mutationFn: (files) => uploadFile(files, customerName),
    onSuccess: () => refetchS3Files(),
  });

  const removeMutation = useMutation({
    mutationFn: (files) => removeFile(files, customerName),
    onSuccess: () => refetchS3Files(),
  });

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleUpload = () => {
    uploadMutation.mutate(selectedFiles);
  };

  const handleRemove = () => {
    removeMutation.mutate(selectedFiles);
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">S3 Operations</h1>
      <Tabs defaultValue="json">
        <TabsList>
          <TabsTrigger value="json">JSON Files</TabsTrigger>
          <TabsTrigger value="description">Description Files</TabsTrigger>
          <TabsTrigger value="images">Image Files</TabsTrigger>
        </TabsList>
        <TabsContent value="json">
          <Input type="file" onChange={handleFileChange} multiple accept=".json" />
          <Button onClick={handleUpload}>Upload JSON</Button>
          <Button onClick={handleRemove}>Remove JSON</Button>
        </TabsContent>
        <TabsContent value="description">
          <Input type="file" onChange={handleFileChange} multiple accept=".txt" />
          <Button onClick={handleUpload}>Upload Description</Button>
          <Button onClick={handleRemove}>Remove Description</Button>
        </TabsContent>
        <TabsContent value="images">
          <Input type="file" onChange={handleFileChange} multiple accept="image/*" />
          <Button onClick={handleUpload}>Upload Image</Button>
          <Button onClick={handleRemove}>Remove Image</Button>
        </TabsContent>
      </Tabs>
      {/* Display list of files here */}
    </div>
  );
};

export default S3Operations;
