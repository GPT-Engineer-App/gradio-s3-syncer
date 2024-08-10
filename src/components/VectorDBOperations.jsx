import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchCollections, createCollection, addDataToVDB } from "../api/vectordb";

const VectorDBOperations = ({ customerName }) => {
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [selectedS3Files, setSelectedS3Files] = useState([]);

  const { data: collections, refetch: refetchCollections } = useQuery({
    queryKey: ["collections", customerName],
    queryFn: () => fetchCollections(customerName),
  });

  const createCollectionMutation = useMutation({
    mutationFn: (name) => createCollection(name, customerName),
    onSuccess: () => refetchCollections(),
  });

  const addDataMutation = useMutation({
    mutationFn: (data) => addDataToVDB(data, customerName),
  });

  const handleCreateCollection = () => {
    createCollectionMutation.mutate(newCollectionName);
  };

  const handleAddData = () => {
    addDataMutation.mutate({
      collectionName: selectedCollection,
      s3Files: selectedS3Files,
    });
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Vector DB Operations</h1>
      <div className="mb-4">
        <Input
          value={newCollectionName}
          onChange={(e) => setNewCollectionName(e.target.value)}
          placeholder="New Collection Name"
        />
        <Button onClick={handleCreateCollection}>Create Collection</Button>
      </div>
      <div className="mb-4">
        {/* Add dropdown for selecting collection */}
        {/* Add multi-select for S3 files */}
        <Button onClick={handleAddData}>Embed and Chunk Files</Button>
      </div>
    </div>
  );
};

export default VectorDBOperations;
