export interface HalteComment {
  comment_id: string;
  halte_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface CommentCreateInput {
  author_name: string;
  body: string;
}
