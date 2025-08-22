import { describe, it, expect, beforeEach } from "vitest"

// Mock Clarity contract functions for garment care testing
const mockGarmentContract = {
  garments: new Map(),
  careHistory: new Map(),
  damageClaims: new Map(),
  careRecommendations: new Map(),
  nextGarmentId: 1,
  nextDamageClaimId: 1,
  totalGarments: 0,
  blockHeight: 1000,
  contractOwner: "owner",
  
  registerGarment: function (
      serviceId,
      garmentType,
      fabricType,
      color,
      careInstructions,
      specialHandling,
      damageProtection,
      protectionFee,
      estimatedValue,
      owner,
  ) {
    // Input validation
    if (!garmentType || garmentType.length === 0) return { error: "ERR-INVALID-INPUT" }
    if (!fabricType || fabricType.length === 0) return { error: "ERR-INVALID-INPUT" }
    if (estimatedValue <= 0) return { error: "ERR-INVALID-INPUT" }
    
    const garmentId = this.nextGarmentId
    
    this.garments.set(garmentId, {
      owner,
      serviceId,
      garmentType,
      fabricType,
      color,
      careInstructions,
      specialHandling,
      damageProtection,
      protectionFee,
      estimatedValue,
      createdAt: this.blockHeight,
      lastCleaned: null,
    })
    
    this.nextGarmentId++
    this.totalGarments++
    
    return { success: garmentId }
  },
  
  recordCareTreatment: function (
      garmentId,
      serviceId,
      careType,
      chemicalsUsed,
      temperature,
      duration,
      specialTreatments,
      recorder,
  ) {
    const garment = this.garments.get(garmentId)
    if (!garment) return { error: "ERR-GARMENT-NOT-FOUND" }
    
    // Authorization check
    const isOwner = recorder === garment.owner
    const isProvider = true // Simplified for testing
    if (!isOwner && !isProvider) return { error: "ERR-NOT-AUTHORIZED" }
    
    // Validate care type
    const validCareTypes = ["dry-clean", "wash", "steam", "press", "stain-removal", "alterations", "restoration"]
    if (!validCareTypes.includes(careType)) return { error: "ERR-INVALID-CARE-TYPE" }
    
    // Record care history
    const historyKey = `${garmentId}-${serviceId}`
    this.careHistory.set(historyKey, {
      careType,
      chemicalsUsed,
      temperature,
      duration,
      specialTreatments,
      completedAt: this.blockHeight,
      qualityRating: null,
    })
    
    // Update garment last cleaned
    garment.lastCleaned = this.blockHeight
    
    return { success: true }
  },
  
  fileDamageClaim: function (
      garmentId,
      serviceId,
      damageType,
      damageDescription,
      estimatedRepairCost,
      claimAmount,
      claimant,
  ) {
    const garment = this.garments.get(garmentId)
    if (!garment) return { error: "ERR-GARMENT-NOT-FOUND" }
    
    // Only garment owner can file claim
    if (claimant !== garment.owner) return { error: "ERR-NOT-AUTHORIZED" }
    
    // Must have damage protection
    if (!garment.damageProtection) return { error: "ERR-NOT-AUTHORIZED" }
    
    // Claim amount cannot exceed estimated value
    if (claimAmount > garment.estimatedValue) return { error: "ERR-INVALID-INPUT" }
    
    const claimId = this.nextDamageClaimId
    
    this.damageClaims.set(claimId, {
      garmentId,
      serviceId,
      customer: claimant,
      damageType,
      damageDescription,
      estimatedRepairCost,
      claimAmount,
      status: "pending",
      filedAt: this.blockHeight,
      resolvedAt: null,
      resolution: null,
    })
    
    this.nextDamageClaimId++
    return { success: claimId }
  },
  
  resolveDamageClaim: function (claimId, resolution, approved, resolver) {
    const claim = this.damageClaims.get(claimId)
    if (!claim) return { error: "ERR-GARMENT-NOT-FOUND" }
    
    // Only contract owner can resolve claims
    if (resolver !== this.contractOwner) return { error: "ERR-NOT-AUTHORIZED" }
    
    // Claim must be pending
    if (claim.status !== "pending") return { error: "ERR-INVALID-INPUT" }
    
    claim.status = approved ? "approved" : "denied"
    claim.resolvedAt = this.blockHeight
    claim.resolution = resolution
    
    return { success: true }
  },
  
  addCareRecommendation: function (
      fabricType,
      garmentType,
      recommendedCare,
      temperatureRange,
      chemicalRestrictions,
      specialNotes,
      adder,
  ) {
    // Only contract owner can add recommendations
    if (adder !== this.contractOwner) return { error: "ERR-NOT-AUTHORIZED" }
    
    const key = `${fabricType}-${garmentType}`
    this.careRecommendations.set(key, {
      recommendedCare,
      temperatureRange,
      chemicalRestrictions,
      specialNotes,
    })
    
    return { success: true }
  },
  
  rateCareQuality: function (garmentId, serviceId, qualityRating, rater) {
    const garment = this.garments.get(garmentId)
    if (!garment) return { error: "ERR-GARMENT-NOT-FOUND" }
    
    const historyKey = `${garmentId}-${serviceId}`
    const careData = this.careHistory.get(historyKey)
    if (!careData) return { error: "ERR-GARMENT-NOT-FOUND" }
    
    // Only garment owner can rate
    if (rater !== garment.owner) return { error: "ERR-NOT-AUTHORIZED" }
    
    // Valid rating range
    if (qualityRating < 1 || qualityRating > 5) return { error: "ERR-INVALID-INPUT" }
    
    careData.qualityRating = qualityRating
    
    return { success: true }
  },
  
  getGarment: function (garmentId) {
    return this.garments.get(garmentId) || null
  },
  
  getCareHistory: function (garmentId, serviceId) {
    const key = `${garmentId}-${serviceId}`
    return this.careHistory.get(key) || null
  },
  
  getDamageClaim: function (claimId) {
    return this.damageClaims.get(claimId) || null
  },
}

describe("Garment Care Contract", () => {
  beforeEach(() => {
    // Reset contract state
    mockGarmentContract.garments.clear()
    mockGarmentContract.careHistory.clear()
    mockGarmentContract.damageClaims.clear()
    mockGarmentContract.careRecommendations.clear()
    mockGarmentContract.nextGarmentId = 1
    mockGarmentContract.nextDamageClaimId = 1
    mockGarmentContract.totalGarments = 0
    mockGarmentContract.blockHeight = 1000
  })
  
  describe("register-garment", () => {
    it("should register a new garment successfully", () => {
      const result = mockGarmentContract.registerGarment(
          1, // serviceId
          "suit",
          "wool",
          "navy",
          "dry clean only",
          "delicate handling",
          true,
          500,
          10000,
          "customer1",
      )
      
      expect(result.success).toBe(1)
      
      const garment = mockGarmentContract.getGarment(1)
      expect(garment).toBeTruthy()
      expect(garment.garmentType).toBe("suit")
      expect(garment.fabricType).toBe("wool")
      expect(garment.damageProtection).toBe(true)
    })
    
    it("should reject empty garment type", () => {
      const result = mockGarmentContract.registerGarment(
          1,
          "",
          "wool",
          "navy",
          "dry clean only",
          "",
          true,
          500,
          10000,
          "customer1",
      )
      
      expect(result.error).toBe("ERR-INVALID-INPUT")
    })
    
    it("should reject zero estimated value", () => {
      const result = mockGarmentContract.registerGarment(
          1,
          "suit",
          "wool",
          "navy",
          "dry clean only",
          "",
          true,
          500,
          0,
          "customer1",
      )
      
      expect(result.error).toBe("ERR-INVALID-INPUT")
    })
  })
  
  describe("record-care-treatment", () => {
    beforeEach(() => {
      mockGarmentContract.registerGarment(
          1,
          "suit",
          "wool",
          "navy",
          "dry clean only",
          "",
          true,
          500,
          10000,
          "customer1",
      )
    })
    
    it("should record care treatment successfully", () => {
      const result = mockGarmentContract.recordCareTreatment(
          1, // garmentId
          1, // serviceId
          "dry-clean",
          "perchloroethylene",
          40, // temperature
          60, // duration
          "stain pre-treatment",
          "customer1",
      )
      
      expect(result.success).toBe(true)
      
      const careHistory = mockGarmentContract.getCareHistory(1, 1)
      expect(careHistory).toBeTruthy()
      expect(careHistory.careType).toBe("dry-clean")
      expect(careHistory.temperature).toBe(40)
    })
    
    it("should reject invalid care type", () => {
      const result = mockGarmentContract.recordCareTreatment(1, 1, "invalid-care", "chemicals", 40, 60, "", "customer1")
      
      expect(result.error).toBe("ERR-INVALID-CARE-TYPE")
    })
    
    it("should update garment last cleaned date", () => {
      mockGarmentContract.recordCareTreatment(1, 1, "dry-clean", "chemicals", 40, 60, "", "customer1")
      
      const garment = mockGarmentContract.getGarment(1)
      expect(garment.lastCleaned).toBe(mockGarmentContract.blockHeight)
    })
  })
  
  describe("file-damage-claim", () => {
    beforeEach(() => {
      mockGarmentContract.registerGarment(
          1,
          "suit",
          "wool",
          "navy",
          "dry clean only",
          "",
          true,
          500,
          10000,
          "customer1",
      )
    })
    
    it("should file damage claim successfully", () => {
      const result = mockGarmentContract.fileDamageClaim(
          1, // garmentId
          1, // serviceId
          "stain",
          "Large coffee stain on front",
          2000, // repair cost
          1500, // claim amount
          "customer1",
      )
      
      expect(result.success).toBe(1)
      
      const claim = mockGarmentContract.getDamageClaim(1)
      expect(claim).toBeTruthy()
      expect(claim.damageType).toBe("stain")
      expect(claim.status).toBe("pending")
    })
    
    it("should reject claim without damage protection", () => {
      // Register garment without damage protection
      mockGarmentContract.registerGarment(
          2,
          "shirt",
          "cotton",
          "white",
          "machine wash",
          "",
          false,
          0,
          5000,
          "customer1",
      )
      
      const result = mockGarmentContract.fileDamageClaim(2, 1, "tear", "Small tear", 500, 300, "customer1")
      
      expect(result.error).toBe("ERR-NOT-AUTHORIZED")
    })
    
    it("should reject claim exceeding garment value", () => {
      const result = mockGarmentContract.fileDamageClaim(
          1,
          1,
          "total loss",
          "Completely destroyed",
          15000,
          15000,
          "customer1",
      )
      
      expect(result.error).toBe("ERR-INVALID-INPUT")
    })
  })
  
  describe("resolve-damage-claim", () => {
    beforeEach(() => {
      mockGarmentContract.registerGarment(
          1,
          "suit",
          "wool",
          "navy",
          "dry clean only",
          "",
          true,
          500,
          10000,
          "customer1",
      )
      mockGarmentContract.fileDamageClaim(1, 1, "stain", "Coffee stain", 2000, 1500, "customer1")
    })
    
    it("should resolve claim as approved", () => {
      const result = mockGarmentContract.resolveDamageClaim(
          1,
          "Claim approved - will cover repair costs",
          true,
          "owner",
      )
      
      expect(result.success).toBe(true)
      
      const claim = mockGarmentContract.getDamageClaim(1)
      expect(claim.status).toBe("approved")
      expect(claim.resolution).toBe("Claim approved - will cover repair costs")
    })
    
    it("should resolve claim as denied", () => {
      const result = mockGarmentContract.resolveDamageClaim(1, "Damage pre-existed service", false, "owner")
      
      expect(result.success).toBe(true)
      
      const claim = mockGarmentContract.getDamageClaim(1)
      expect(claim.status).toBe("denied")
    })
    
    it("should reject unauthorized resolution", () => {
      const result = mockGarmentContract.resolveDamageClaim(1, "Unauthorized resolution", true, "customer1")
      
      expect(result.error).toBe("ERR-NOT-AUTHORIZED")
    })
  })
  
  describe("care recommendations", () => {
    it("should add care recommendation successfully", () => {
      const result = mockGarmentContract.addCareRecommendation(
          "wool",
          "suit",
          "Professional dry cleaning only",
          "30-40°C",
          "No bleach, no fabric softener",
          "Steam to remove wrinkles",
          "owner",
      )
      
      expect(result.success).toBe(true)
    })
    
    it("should reject unauthorized recommendation addition", () => {
      const result = mockGarmentContract.addCareRecommendation(
          "wool",
          "suit",
          "Care instructions",
          "30-40°C",
          "No bleach",
          "",
          "customer1",
      )
      
      expect(result.error).toBe("ERR-NOT-AUTHORIZED")
    })
  })
  
  describe("rate-care-quality", () => {
    beforeEach(() => {
      mockGarmentContract.registerGarment(
          1,
          "suit",
          "wool",
          "navy",
          "dry clean only",
          "",
          true,
          500,
          10000,
          "customer1",
      )
      mockGarmentContract.recordCareTreatment(1, 1, "dry-clean", "chemicals", 40, 60, "", "customer1")
    })
    
    it("should rate care quality successfully", () => {
      const result = mockGarmentContract.rateCareQuality(1, 1, 5, "customer1")
      
      expect(result.success).toBe(true)
      
      const careHistory = mockGarmentContract.getCareHistory(1, 1)
      expect(careHistory.qualityRating).toBe(5)
    })
    
    it("should reject invalid rating", () => {
      const result = mockGarmentContract.rateCareQuality(1, 1, 6, "customer1")
      
      expect(result.error).toBe("ERR-INVALID-INPUT")
    })
    
    it("should reject unauthorized rating", () => {
      const result = mockGarmentContract.rateCareQuality(1, 1, 5, "other-customer")
      
      expect(result.error).toBe("ERR-NOT-AUTHORIZED")
    })
  })
})
