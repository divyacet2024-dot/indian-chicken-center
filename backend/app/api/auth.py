from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import Token, LoginRequest, ActivationRequest, PreferencesUpdate
from app.services.auth_service import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user_and_business,
    get_current_user_and_business_strict,
)
from app.models.user import User
from app.models.business import Business
from app.models.truck import Truck

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/activate", response_model=Token, status_code=status.HTTP_201_CREATED)
def activate_account(request: ActivationRequest, db: Session = Depends(get_db)):
    if request.password != request.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )

    # Check if user with mobile_number already exists
    existing_user = db.query(User).filter(User.email_or_phone == request.mobile_number).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account already exists with this mobile number. Please sign in directly."
        )

    # Check if Business already exists or create new Business
    business = db.query(Business).filter(Business.business_name == request.business_name).first()
    if not business:
        business = Business(
            business_name=request.business_name,
            owner_name=request.owner_name,
            contact_details=request.mobile_number
        )
        db.add(business)
        db.flush()

    # Create new Owner User with bcrypt hashed password
    user = User(
        business_id=business.id,
        email_or_phone=request.mobile_number,
        password_hash=get_password_hash(request.password),
        role="owner",
        is_active=True,
        preferred_language="en"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Ensure default distribution trucks exist for newly activated business
    truck_count = db.query(Truck).filter(Truck.business_id == business.id).count()
    if truck_count == 0:
        t1 = Truck(business_id=business.id, registration_number="KA-19-EA-1008", status="available", notes="Truck 1")
        t2 = Truck(business_id=business.id, registration_number="KA-19-EA-2020", status="available", notes="Truck 2")
        db.add_all([t1, t2])
        db.commit()

    access_token = create_access_token(
        data={"sub": user.id, "business_id": user.business_id}
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        business_id=user.business_id,
        email_or_phone=user.email_or_phone,
        role=user.role
    )

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_or_phone == request.email_or_phone).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/mobile or password credentials"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated")

    access_token = create_access_token(
        data={"sub": user.id, "business_id": user.business_id}
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        business_id=user.business_id,
        email_or_phone=user.email_or_phone,
        role=user.role
    )

@router.get("/me")
def get_current_user(current_data=Depends(get_current_user_and_business_strict)):
    user, business = current_data
    return {
        "user_id": user.id,
        "email_or_phone": user.email_or_phone,
        "role": user.role,
        "preferred_language": user.preferred_language or "en",
        "business": {
            "id": business.id,
            "business_name": business.business_name,
            "owner_name": business.owner_name,
            "contact_details": business.contact_details
        }
    }

@router.patch("/preferences")
def update_preferences(
    preferences: PreferencesUpdate,
    current_data=Depends(get_current_user_and_business_strict),
    db: Session = Depends(get_db),
):
    user, _ = current_data
    user.preferred_language = preferences.preferred_language
    db.commit()
    db.refresh(user)
    return {"preferred_language": user.preferred_language}
