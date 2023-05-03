export enum IDB_EVENT {
  INITIALIZE              = 'INITIALIZE',
  DROP                    = 'DROP',
  ATTACHMENT_ADD          = 'ATTACHMENT_ADD',
  ATTACHMENT_GET          = 'ATTACHMENT_GET',
  ATTACHMENT_UPDATE       = 'ATTACHMENT_UPDATE',
  ATTACHMENT_DELETE       = 'ATTACHMENT_DELETE',
  CATEGORY_ADD            = 'CATEGORY_ADD',
  CATEGORY_GET            = 'CATEGORY_GET',
  CATEGORY_GET_ALL        = 'CATEGORY_GET_ALL',
  CATEGORY_UPDATE         = 'CATEGORY_UPDATE',
  CATEGORY_DELETE         = 'CATEGORY_DELETE',
  EXPENSE_ADD             = 'EXPENSE_ADD',
  EXPENSE_GET             = 'EXPENSE_GET',
  EXPENSE_GET_RANGE       = 'EXPENSE_GET_RANGE',
  EXPENSE_COUNT_CATEGORY  = 'EXPENSE_COUNT_CATEGORY',
  EXPENSE_UPDATE          = 'EXPENSE_UPDATE',
  EXPENSE_DELETE          = 'EXPENSE_DELETE',
}

export interface AttachmentType {
  id?: number,
  mime: string,
  arraybuffer: ArrayBuffer,
}

export interface CategoryType {
  id?: number,
  name: string,
  color: string,
}

export interface ExpenseType {
  id?: number,
  amount: number,
  datetime: Date, // UTC
  category: number,
  description: string,
  attachment?: number,
}
