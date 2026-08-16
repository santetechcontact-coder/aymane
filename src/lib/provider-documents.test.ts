import { beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.fn();
const remove = vi.fn();
const rpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: { from: () => ({ upload, remove }) },
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

const { depositProviderDocument, DocumentTooLargeError, MAX_DOCUMENT_BYTES } =
  await import("./provider-documents");

const fileOf = (size: number, name = "diplome.pdf", type = "application/pdf") => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  // jsdom's File has no arrayBuffer in this environment; checksum is optional.
  Object.defineProperty(file, "arrayBuffer", { value: () => Promise.resolve(new ArrayBuffer(8)) });
  return file;
};

beforeEach(() => {
  upload.mockReset().mockResolvedValue({ error: null });
  remove.mockReset().mockResolvedValue({ error: null });
  rpc.mockReset().mockResolvedValue({ data: "doc-1", error: null });
});

describe("depositProviderDocument", () => {
  it("registers metadata alongside the stored file", async () => {
    const result = await depositProviderDocument({
      file: fileOf(2048), userId: "user-1", category: "diploma", label: "Diplôme",
    });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("register_provider_document", expect.objectContaining({
      _category: "diploma",
      _original_filename: "diplome.pdf",
      _mime_type: "application/pdf",
      _file_size_bytes: 2048,
    }));
    expect(result.documentId).toBe("doc-1");
    expect(result.path).toMatch(/^user-1\/diploma-\d+\.pdf$/);
  });

  it("accepts any file type — judging a document is the reviewer's job", async () => {
    await expect(depositProviderDocument({
      file: fileOf(1024, "scan.heic", "image/heic"), userId: "user-1", category: "cni",
    })).resolves.toMatchObject({ documentId: "doc-1" });

    await expect(depositProviderDocument({
      file: fileOf(1024, "notes.txt", "text/plain"), userId: "user-1", category: "other",
    })).resolves.toMatchObject({ documentId: "doc-1" });
  });

  it("refuses a file above the size ceiling before touching storage", async () => {
    await expect(depositProviderDocument({
      file: fileOf(MAX_DOCUMENT_BYTES + 1), userId: "user-1", category: "cv",
    })).rejects.toBeInstanceOf(DocumentTooLargeError);

    expect(upload).not.toHaveBeenCalled();
  });

  it("removes the stored file when its metadata cannot be registered", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("rls denied") });

    await expect(depositProviderDocument({
      file: fileOf(1024), userId: "user-1", category: "cni",
    })).rejects.toThrow("rls denied");

    // No orphan binary must be left behind.
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("keeps history by declaring the document it supersedes", async () => {
    await depositProviderDocument({
      file: fileOf(1024), userId: "user-1", category: "cni", replacesDocumentId: "doc-0",
    });

    expect(rpc).toHaveBeenCalledWith("register_provider_document", expect.objectContaining({
      _replaces_document_id: "doc-0",
    }));
  });

  it("stores files under the owner's own folder", async () => {
    const { path } = await depositProviderDocument({
      file: fileOf(1024), userId: "user-42", category: "legal",
    });
    expect(path.startsWith("user-42/")).toBe(true);
  });
});
