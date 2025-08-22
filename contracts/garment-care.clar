;; Garment Care Contract
;; Tracks garment care instructions and special handling

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u200))
(define-constant ERR-GARMENT-NOT-FOUND (err u201))
(define-constant ERR-INVALID-CARE-TYPE (err u202))
(define-constant ERR-INVALID-INPUT (err u203))
(define-constant ERR-DAMAGE-CLAIM-EXISTS (err u204))

;; Data Variables
(define-data-var next-garment-id uint u1)
(define-data-var next-damage-claim-id uint u1)
(define-data-var total-garments uint u0)

;; Data Maps
(define-map garments
  { garment-id: uint }
  {
    owner: principal,
    service-id: uint,
    garment-type: (string-ascii 50),
    fabric-type: (string-ascii 50),
    color: (string-ascii 30),
    care-instructions: (string-ascii 300),
    special-handling: (string-ascii 200),
    damage-protection: bool,
    protection-fee: uint,
    estimated-value: uint,
    created-at: uint,
    last-cleaned: (optional uint)
  }
)

(define-map care-history
  { garment-id: uint, service-id: uint }
  {
    care-type: (string-ascii 50),
    chemicals-used: (string-ascii 200),
    temperature: uint,
    duration: uint,
    special-treatments: (string-ascii 200),
    completed-at: uint,
    quality-rating: (optional uint)
  }
)

(define-map damage-claims
  { claim-id: uint }
  {
    garment-id: uint,
    service-id: uint,
    customer: principal,
    damage-type: (string-ascii 100),
    damage-description: (string-ascii 500),
    estimated-repair-cost: uint,
    claim-amount: uint,
    status: (string-ascii 20),
    filed-at: uint,
    resolved-at: (optional uint),
    resolution: (optional (string-ascii 300))
  }
)

(define-map care-recommendations
  { fabric-type: (string-ascii 50), garment-type: (string-ascii 50) }
  {
    recommended-care: (string-ascii 100),
    temperature-range: (string-ascii 20),
    chemical-restrictions: (string-ascii 200),
    special-notes: (string-ascii 300)
  }
)

;; Public Functions

;; Register a new garment
(define-public (register-garment
  (service-id uint)
  (garment-type (string-ascii 50))
  (fabric-type (string-ascii 50))
  (color (string-ascii 30))
  (care-instructions (string-ascii 300))
  (special-handling (string-ascii 200))
  (damage-protection bool)
  (protection-fee uint)
  (estimated-value uint))
  (let
    (
      (garment-id (var-get next-garment-id))
    )
    ;; Input validation
    (asserts! (> (len garment-type) u0) ERR-INVALID-INPUT)
    (asserts! (> (len fabric-type) u0) ERR-INVALID-INPUT)
    (asserts! (> estimated-value u0) ERR-INVALID-INPUT)

    ;; Create garment record
    (map-set garments
      { garment-id: garment-id }
      {
        owner: tx-sender,
        service-id: service-id,
        garment-type: garment-type,
        fabric-type: fabric-type,
        color: color,
        care-instructions: care-instructions,
        special-handling: special-handling,
        damage-protection: damage-protection,
        protection-fee: protection-fee,
        estimated-value: estimated-value,
        created-at: block-height,
        last-cleaned: none
      }
    )

    ;; Update counters
    (var-set next-garment-id (+ garment-id u1))
    (var-set total-garments (+ (var-get total-garments) u1))

    (ok garment-id)
  )
)

;; Record care treatment
(define-public (record-care-treatment
  (garment-id uint)
  (service-id uint)
  (care-type (string-ascii 50))
  (chemicals-used (string-ascii 200))
  (temperature uint)
  (duration uint)
  (special-treatments (string-ascii 200)))
  (let
    (
      (garment-data (unwrap! (map-get? garments { garment-id: garment-id }) ERR-GARMENT-NOT-FOUND))
    )
    ;; Only owner or authorized provider can record treatment
    (asserts! (or (is-eq tx-sender (get owner garment-data))
                  (is-authorized-provider tx-sender)) ERR-NOT-AUTHORIZED)

    ;; Validate care type
    (asserts! (is-valid-care-type care-type) ERR-INVALID-CARE-TYPE)

    ;; Record care history
    (map-set care-history
      { garment-id: garment-id, service-id: service-id }
      {
        care-type: care-type,
        chemicals-used: chemicals-used,
        temperature: temperature,
        duration: duration,
        special-treatments: special-treatments,
        completed-at: block-height,
        quality-rating: none
      }
    )

    ;; Update garment last cleaned date
    (map-set garments
      { garment-id: garment-id }
      (merge garment-data { last-cleaned: (some block-height) })
    )

    (ok true)
  )
)

;; File damage claim
(define-public (file-damage-claim
  (garment-id uint)
  (service-id uint)
  (damage-type (string-ascii 100))
  (damage-description (string-ascii 500))
  (estimated-repair-cost uint)
  (claim-amount uint))
  (let
    (
      (claim-id (var-get next-damage-claim-id))
      (garment-data (unwrap! (map-get? garments { garment-id: garment-id }) ERR-GARMENT-NOT-FOUND))
    )
    ;; Only garment owner can file claim
    (asserts! (is-eq tx-sender (get owner garment-data)) ERR-NOT-AUTHORIZED)
    ;; Must have damage protection
    (asserts! (get damage-protection garment-data) ERR-NOT-AUTHORIZED)
    ;; Claim amount cannot exceed estimated value
    (asserts! (<= claim-amount (get estimated-value garment-data)) ERR-INVALID-INPUT)

    ;; Create damage claim
    (map-set damage-claims
      { claim-id: claim-id }
      {
        garment-id: garment-id,
        service-id: service-id,
        customer: tx-sender,
        damage-type: damage-type,
        damage-description: damage-description,
        estimated-repair-cost: estimated-repair-cost,
        claim-amount: claim-amount,
        status: "pending",
        filed-at: block-height,
        resolved-at: none,
        resolution: none
      }
    )

    (var-set next-damage-claim-id (+ claim-id u1))
    (ok claim-id)
  )
)

;; Resolve damage claim
(define-public (resolve-damage-claim
  (claim-id uint)
  (resolution (string-ascii 300))
  (approved bool))
  (let
    (
      (claim-data (unwrap! (map-get? damage-claims { claim-id: claim-id }) ERR-GARMENT-NOT-FOUND))
    )
    ;; Only contract owner can resolve claims
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Claim must be pending
    (asserts! (is-eq (get status claim-data) "pending") ERR-INVALID-INPUT)

    ;; Update claim status
    (map-set damage-claims
      { claim-id: claim-id }
      (merge claim-data {
        status: (if approved "approved" "denied"),
        resolved-at: (some block-height),
        resolution: (some resolution)
      })
    )

    (ok true)
  )
)

;; Add care recommendation
(define-public (add-care-recommendation
  (fabric-type (string-ascii 50))
  (garment-type (string-ascii 50))
  (recommended-care (string-ascii 100))
  (temperature-range (string-ascii 20))
  (chemical-restrictions (string-ascii 200))
  (special-notes (string-ascii 300)))
  (begin
    ;; Only contract owner can add recommendations
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)

    (map-set care-recommendations
      { fabric-type: fabric-type, garment-type: garment-type }
      {
        recommended-care: recommended-care,
        temperature-range: temperature-range,
        chemical-restrictions: chemical-restrictions,
        special-notes: special-notes
      }
    )

    (ok true)
  )
)

;; Rate care quality
(define-public (rate-care-quality
  (garment-id uint)
  (service-id uint)
  (quality-rating uint))
  (let
    (
      (garment-data (unwrap! (map-get? garments { garment-id: garment-id }) ERR-GARMENT-NOT-FOUND))
      (care-data (unwrap! (map-get? care-history { garment-id: garment-id, service-id: service-id }) ERR-GARMENT-NOT-FOUND))
    )
    ;; Only garment owner can rate
    (asserts! (is-eq tx-sender (get owner garment-data)) ERR-NOT-AUTHORIZED)
    ;; Valid rating range
    (asserts! (and (>= quality-rating u1) (<= quality-rating u5)) ERR-INVALID-INPUT)

    ;; Update care history with rating
    (map-set care-history
      { garment-id: garment-id, service-id: service-id }
      (merge care-data { quality-rating: (some quality-rating) })
    )

    (ok true)
  )
)

;; Read-only Functions

;; Get garment details
(define-read-only (get-garment (garment-id uint))
  (map-get? garments { garment-id: garment-id })
)

;; Get care history
(define-read-only (get-care-history (garment-id uint) (service-id uint))
  (map-get? care-history { garment-id: garment-id, service-id: service-id })
)

;; Get damage claim
(define-read-only (get-damage-claim (claim-id uint))
  (map-get? damage-claims { claim-id: claim-id })
)

;; Get care recommendation
(define-read-only (get-care-recommendation (fabric-type (string-ascii 50)) (garment-type (string-ascii 50)))
  (map-get? care-recommendations { fabric-type: fabric-type, garment-type: garment-type })
)

;; Get total garments
(define-read-only (get-total-garments)
  (var-get total-garments)
)

;; Private Functions

;; Check if provider is authorized (simplified check)
(define-private (is-authorized-provider (provider principal))
  ;; This would integrate with service-management contract in a real implementation
  true
)

;; Validate care type
(define-private (is-valid-care-type (care-type (string-ascii 50)))
  (or (is-eq care-type "dry-clean")
      (is-eq care-type "wash")
      (is-eq care-type "steam")
      (is-eq care-type "press")
      (is-eq care-type "stain-removal")
      (is-eq care-type "alterations")
      (is-eq care-type "restoration"))
)
