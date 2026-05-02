import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { ChevronLeft, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { THREAD_FLAIRS } from "@shared/schema";
import { useAuth } from "@/components/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: number;
  name: string;
  slug: string;
}

function ImagePicker({ onImageChange }: { onImageChange: (dataUrl: string | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Please choose an image under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      onImageChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const clear = () => {
    setPreview(null);
    onImageChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        data-testid="input-image-file-new"
      />
      {preview ? (
        <div className="space-y-2">
          <div className="relative inline-block">
            <img src={preview} alt="Preview" className="max-h-48 max-w-full rounded-lg border border-border object-contain" />
            <button
              type="button"
              onClick={clear}
              className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 text-muted-foreground hover:text-destructive shadow-sm"
              data-testid="button-remove-image-new"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Photo attached — click × to remove</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary border-2 border-dashed border-border hover:border-primary/40 rounded-lg px-4 py-5 transition-colors"
          data-testid="button-attach-image-new"
        >
          <ImageIcon className="w-4 h-4" />
          Attach a photo (optional, max 5 MB)
        </button>
      )}
    </div>
  );
}

export default function NewThreadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const defaultCategory = params.get("category") || "";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [flair, setFlair] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const defaultCat = categories?.find(c => c.slug === defaultCategory);
  const resolvedCategoryId = categoryId || (defaultCat ? String(defaultCat.id) : "");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/threads", {
        title: title.trim(),
        categoryId: Number(resolvedCategoryId),
        content: content.trim(),
        ...(imageUrl ? { imageUrl } : {}),
        ...(flair ? { flair } : {}),
      });
      return res.json();
    },
    onSuccess: (thread) => {
      qc.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Post created!" });
      navigate(`/thread/${thread.id}`);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-sm">You need to be signed in to post.</p>
        <Button asChild className="mt-4"><Link href="/">Go home</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Home
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">New Post</span>
      </div>

      <h1 className="text-xl font-bold" style={{ fontFamily: "'Noto Serif', Georgia, serif" }}>Start a discussion</h1>

      <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select value={resolvedCategoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="category" data-testid="select-category">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map(cat => (
                <SelectItem key={cat.id} value={String(cat.id)} data-testid={`option-category-${cat.id}`}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="flair">Tag <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Select value={flair} onValueChange={setFlair}>
            <SelectTrigger id="flair" data-testid="select-flair">
              <SelectValue placeholder="Choose a tag…" />
            </SelectTrigger>
            <SelectContent>
              {THREAD_FLAIRS.map(f => (
                <SelectItem key={f} value={f} data-testid={`option-flair-${f}`}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Give your post a clear, descriptive title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            data-testid="input-thread-title"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            placeholder="Share your recipe, question, or experience..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={10}
            className="resize-none"
            required
            data-testid="textarea-thread-content"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Photo (optional)</Label>
          <ImagePicker onImageChange={setImageUrl} />
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={!title.trim() || !content.trim() || !resolvedCategoryId || createMutation.isPending}
            data-testid="button-create-thread"
          >
            {createMutation.isPending ? "Posting..." : "Post discussion"}
          </Button>
          <Button variant="outline" type="button" onClick={() => navigate("/")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
