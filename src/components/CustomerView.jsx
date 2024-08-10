import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { uploadZipFile } from "../api/customer";

const CustomerView = ({ customerName }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: (file) => uploadZipFile(file, customerName),
  });

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Customer View</h1>
      <Input type="file" onChange={handleFileChange} accept=".zip" />
      <Button onClick={handleUpload}>Upload Zip File</Button>
    </div>
  );
};

export default CustomerView;
