# أمانات المحلات — ERD & Database Schema

## المعادلة الأساسية (Real-time)

```
المبيعات الفعلية (qty_sold) = qty_sent_total − qty_on_hand − qty_returned_total
```

تُحدَّث تلقائياً عند اعتماد كل حركة على جدول `ConsignmentBalance`.

---

## ERD (Mermaid)

```mermaid
erDiagram
    Customer ||--o{ ConsignmentMovement : "shop"
    Customer ||--o{ ConsignmentBalance : "holds"
    Warehouse ||--o{ ConsignmentMovement : "source"
    Warehouse ||--o{ ConsignmentBalance : "source"
    Branch ||--o{ ConsignmentMovement : optional
    User ||--o{ ConsignmentMovement : creates
    User ||--o{ ConsignmentAuditLog : audits

    ConsignmentMovement ||--|{ ConsignmentMovementLine : contains
    ProductVariant ||--o{ ConsignmentMovementLine : sku
    ProductVariant ||--o{ ConsignmentBalance : sku

    Customer ||--o{ ConsignmentActivityLog : activity
    ConsignmentMovement ||--o{ ConsignmentActivityLog : activity

    ConsignmentMovement {
        uuid id PK
        string code UK
        enum movement_type
        date movement_date
        uuid customer_id FK
        uuid counterparty_customer_id FK
        uuid warehouse_id FK
        uuid branch_id FK
        enum status
        decimal total_qty
        decimal total_value
        bool is_deleted
        datetime deleted_at
    }

    ConsignmentMovementLine {
        uuid id PK
        uuid movement_id FK
        uuid variant_id FK
        decimal quantity
        decimal unit_price
        string batch_lot
        string barcode_snapshot
        decimal system_qty
        decimal counted_qty
        decimal variance_qty
    }

    ConsignmentBalance {
        uuid id PK
        uuid customer_id FK
        uuid variant_id FK
        uuid warehouse_id FK
        decimal qty_sent_total
        decimal qty_returned_total
        decimal qty_on_hand
        decimal qty_sold
        datetime last_movement_at
    }

    ConsignmentAuditLog {
        uuid id PK
        string entity_type
        uuid entity_id
        string action
        json payload
    }

    ConsignmentActivityLog {
        uuid id PK
        uuid customer_id FK
        uuid movement_id FK
        string action
    }
```

---

## أنواع الحركات

| النوع | الكود | التأثير على الرصيد |
|--------|------|---------------------|
| إرسال أمانة | `send` | +sent, +on_hand, −مخزن المكتب |
| مرتجع أمانة | `return` | +returned, −on_hand, +مخزن المكتب |
| تحويل أمانة | `transfer` | −on_hand محل أ، +on_hand محل ب |
| جرد أمانة | `count` | ضبط on_hand = counted، إعادة sold |
| تسوية عجز/زيادة | `settlement` | تعديل on_hand حسب variance |

---

## فهرسة (Indexing)

- `ConsignmentMovement`: `(customer, movement_type, status)`, `(movement_date, status)`, `code`
- `ConsignmentBalance`: `(customer, qty_on_hand)`, `variant`, unique `(customer, variant, warehouse)`
- `ConsignmentMovementLine`: `(movement, variant)`
- `ConsignmentAuditLog`: `(entity_type, entity_id)`, `created_at`

---

## قيود (Constraints)

- `ConsignmentBalance`: UNIQUE (customer, variant, warehouse)
- `ConsignmentMovementLine`: FK CASCADE على الحركة
- `qty_on_hand >= 0` عند الاعتماد (ValidationError)
- Soft delete: `is_deleted` على الحركات فقط — الأرصدة والتدقيق لا تُحذف

---

## API Endpoints

| Method | Path |
|--------|------|
| GET | `/inventory/consignment/dashboard/` |
| GET/POST | `/inventory/consignment/movements/` |
| GET/DELETE | `/inventory/consignment/movements/{id}/` |
| POST | `/inventory/consignment/movements/{id}/approve/` |
| POST | `/inventory/consignment/movements/{id}/cancel/` |
| GET | `/inventory/consignment/customers/{id}/balance/` |
| GET | `/inventory/consignment/customers/{id}/realtime-sales/` |

---

## تقارير مرتبطة (خارطة الطريق)

- كشف حساب عميل / حركة العميل → `customer_balance` + `movements?customer=`
- تقرير أمانات → Dashboard + Aging by shop
- ربط التحصيل والمتأخرين → وحدة `receivables` الحالية
