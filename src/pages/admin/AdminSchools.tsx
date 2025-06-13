
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2 } from "lucide-react";

interface School {
  id: string;
  name: string;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

export default function AdminSchools() {
  const [schools, setSchools] = useState<School[]>([]);
  const [newSchool, setNewSchool] = useState({
    name: "",
    address: "",
    contact_email: "",
    contact_phone: ""
  });
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSchools(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching schools",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createSchool = async () => {
    if (!newSchool.name.trim()) {
      toast({
        title: "School name required",
        description: "Please enter a school name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('schools')
        .insert([newSchool]);

      if (error) throw error;

      toast({
        title: "School created",
        description: "School has been created successfully",
      });

      setNewSchool({ name: "", address: "", contact_email: "", contact_phone: "" });
      fetchSchools();
    } catch (error: any) {
      toast({
        title: "Error creating school",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateSchool = async () => {
    if (!editingSchool) return;

    try {
      const { error } = await supabase
        .from('schools')
        .update({
          name: editingSchool.name,
          address: editingSchool.address,
          contact_email: editingSchool.contact_email,
          contact_phone: editingSchool.contact_phone
        })
        .eq('id', editingSchool.id);

      if (error) throw error;

      toast({
        title: "School updated",
        description: "School has been updated successfully",
      });

      setEditingSchool(null);
      fetchSchools();
    } catch (error: any) {
      toast({
        title: "Error updating school",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteSchool = async (id: string) => {
    try {
      const { error } = await supabase
        .from('schools')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "School deleted",
        description: "School has been deleted successfully",
      });

      fetchSchools();
    } catch (error: any) {
      toast({
        title: "Error deleting school",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center">Loading schools...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Schools Management</h2>
        <p className="text-gray-600">Create and manage schools in the system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New School</CardTitle>
          <CardDescription>Add a new school to the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="school-name">School Name *</Label>
              <Input
                id="school-name"
                value={newSchool.name}
                onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                placeholder="Enter school name"
              />
            </div>
            <div>
              <Label htmlFor="school-address">Address</Label>
              <Input
                id="school-address"
                value={newSchool.address}
                onChange={(e) => setNewSchool({ ...newSchool, address: e.target.value })}
                placeholder="Enter school address"
              />
            </div>
            <div>
              <Label htmlFor="school-email">Contact Email</Label>
              <Input
                id="school-email"
                type="email"
                value={newSchool.contact_email}
                onChange={(e) => setNewSchool({ ...newSchool, contact_email: e.target.value })}
                placeholder="Enter contact email"
              />
            </div>
            <div>
              <Label htmlFor="school-phone">Contact Phone</Label>
              <Input
                id="school-phone"
                value={newSchool.contact_phone}
                onChange={(e) => setNewSchool({ ...newSchool, contact_phone: e.target.value })}
                placeholder="Enter contact phone"
              />
            </div>
          </div>
          <Button onClick={createSchool} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Create School
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schools List</CardTitle>
          <CardDescription>All schools in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">
                    {editingSchool?.id === school.id ? (
                      <Input
                        value={editingSchool.name}
                        onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                      />
                    ) : (
                      school.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingSchool?.id === school.id ? (
                      <Input
                        value={editingSchool.address || ""}
                        onChange={(e) => setEditingSchool({ ...editingSchool, address: e.target.value })}
                      />
                    ) : (
                      school.address || 'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingSchool?.id === school.id ? (
                      <Input
                        value={editingSchool.contact_email || ""}
                        onChange={(e) => setEditingSchool({ ...editingSchool, contact_email: e.target.value })}
                      />
                    ) : (
                      school.contact_email || 'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingSchool?.id === school.id ? (
                      <Input
                        value={editingSchool.contact_phone || ""}
                        onChange={(e) => setEditingSchool({ ...editingSchool, contact_phone: e.target.value })}
                      />
                    ) : (
                      school.contact_phone || 'N/A'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {editingSchool?.id === school.id ? (
                        <>
                          <Button size="sm" onClick={updateSchool}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingSchool(null)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSchool(school)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteSchool(school.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
