// Purpose: scaffold spec for ideas (seam: ideas).
export default {
  seamName: "ideas",
  description: "Idea capture and management",
  models: [
    {
      name: "IdeaNote",
      description: "A note attached to an idea",
      fields: [
        { name: "id", type: "uuid" },
        { name: "author", type: "string?" },
        { name: "body", type: "string" },
        { name: "created_at", type: "number" }
      ]
    },
    {
      name: "Idea",
      description: "Primary idea record",
      fields: [
        { name: "id", type: "uuid" },
        { name: "title", type: "string" },
        { name: "summary", type: "string" },
        { name: "status", type: "string" },
        { name: "tags", type: "string[]" },
        { name: "notes", type: "IdeaNote[]" },
        { name: "relatedTaskIds", type: "uuid[]" },
        { name: "relatedIdeaIds", type: "uuid[]" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" }
      ]
    },
    {
      name: "IdeaListFilter",
      description: "Filter options for listing ideas",
      fields: [
        { name: "status", type: "string?" },
        { name: "tag", type: "string?" },
        { name: "query", type: "string?" },
        { name: "limit", type: "number?" }
      ]
    },
    {
      name: "CreateIdeaInput",
      description: "Input for creating an idea",
      fields: [
        { name: "title", type: "string" },
        { name: "summary", type: "string?" },
        { name: "status", type: "string?" },
        { name: "tags", type: "string[]?" },
        { name: "relatedTaskIds", type: "uuid[]?" },
        { name: "relatedIdeaIds", type: "uuid[]?" }
      ]
    },
    {
      name: "UpdateIdeaInput",
      description: "Input for updating an idea",
      fields: [
        { name: "id", type: "uuid" },
        { name: "title", type: "string?" },
        { name: "summary", type: "string?" },
        { name: "status", type: "string?" },
        { name: "tags", type: "string[]?" },
        { name: "relatedTaskIds", type: "uuid[]?" },
        { name: "relatedIdeaIds", type: "uuid[]?" }
      ]
    },
    {
      name: "IdeaIdInput",
      description: "Input for fetching a single idea",
      fields: [
        { name: "id", type: "uuid" }
      ]
    },
    {
      name: "AddIdeaNoteInput",
      description: "Input for adding a note to an idea",
      fields: [
        { name: "ideaId", type: "uuid" },
        { name: "author", type: "string?" },
        { name: "body", type: "string" }
      ]
    }
  ],
  methods: [
    {
      name: "create",
      description: "Create a new idea",
      inputType: "CreateIdeaInput",
      outputType: "Idea"
    },
    {
      name: "update",
      description: "Update an existing idea",
      inputType: "UpdateIdeaInput",
      outputType: "Idea"
    },
    {
      name: "list",
      description: "List ideas with optional filters",
      inputType: "IdeaListFilter",
      outputType: "Idea[]"
    },
    {
      name: "get",
      description: "Fetch a single idea",
      inputType: "IdeaIdInput",
      outputType: "Idea"
    },
    {
      name: "addNote",
      description: "Add a note to an idea",
      inputType: "AddIdeaNoteInput",
      outputType: "Idea"
    }
  ],
  scenarios: [
    { name: "success", type: "success", description: "Happy path" },
    { name: "not_found", type: "error", description: "Idea not found" }
  ],
  errors: [
    { code: "VALIDATION_FAILED", message: "Idea not found" }
  ]
};
