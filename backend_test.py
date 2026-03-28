#!/usr/bin/env python3
"""
Backend API Testing for Kopplingsguide App
Tests all authentication, access codes, and settings endpoints
"""

import requests
import sys
import json
from datetime import datetime

class KopplingsguideAPITester:
    def __init__(self, base_url="https://kopplingsguide.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
        self.test_access_code_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append(f"{name}: {details}")

    def test_admin_login(self):
        """Test admin login with correct credentials"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/auth/admin/login",
                json={
                    "email": "admin@kopplingsguide.se",
                    "password": "Admin123!"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("role") == "admin" and data.get("email") == "admin@kopplingsguide.se":
                    self.log_test("Admin Login", True)
                    return True
                else:
                    self.log_test("Admin Login", False, f"Invalid response data: {data}")
                    return False
            else:
                self.log_test("Admin Login", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False

    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/auth/admin/login",
                json={
                    "email": "admin@kopplingsguide.se",
                    "password": "wrongpassword"
                }
            )
            
            if response.status_code == 401:
                self.log_test("Admin Login Invalid Credentials", True)
                return True
            else:
                self.log_test("Admin Login Invalid Credentials", False, f"Expected 401, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Admin Login Invalid Credentials", False, f"Exception: {str(e)}")
            return False

    def test_get_auth_me_admin(self):
        """Test getting current admin user info"""
        try:
            response = self.session.get(f"{self.base_url}/api/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("role") == "admin":
                    self.log_test("Get Admin Auth Me", True)
                    return True
                else:
                    self.log_test("Get Admin Auth Me", False, f"Invalid role: {data.get('role')}")
                    return False
            else:
                self.log_test("Get Admin Auth Me", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get Admin Auth Me", False, f"Exception: {str(e)}")
            return False

    def test_create_access_code(self):
        """Test creating a new access code"""
        try:
            test_code_data = {
                "name": "Test User",
                "code": "TEST123",
                "description": "Test access code for automated testing"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/access-codes",
                json=test_code_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "TEST123" and data.get("name") == "Test User":
                    self.test_access_code_id = data.get("id")
                    self.log_test("Create Access Code", True)
                    return True
                else:
                    self.log_test("Create Access Code", False, f"Invalid response data: {data}")
                    return False
            else:
                self.log_test("Create Access Code", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create Access Code", False, f"Exception: {str(e)}")
            return False

    def test_get_access_codes(self):
        """Test getting all access codes"""
        try:
            response = self.session.get(f"{self.base_url}/api/access-codes")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Check if our test code is in the list
                    test_code_found = any(code.get("code") == "TEST123" for code in data)
                    if test_code_found:
                        self.log_test("Get Access Codes", True)
                        return True
                    else:
                        self.log_test("Get Access Codes", False, "Test code not found in list")
                        return False
                else:
                    self.log_test("Get Access Codes", False, f"Expected list, got: {type(data)}")
                    return False
            else:
                self.log_test("Get Access Codes", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get Access Codes", False, f"Exception: {str(e)}")
            return False

    def test_user_login_with_code(self):
        """Test user login with the created access code"""
        try:
            # Create a new session for user login
            user_session = requests.Session()
            response = user_session.post(
                f"{self.base_url}/api/auth/user/login",
                json={"code": "TEST123"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("role") == "user":
                    self.log_test("User Login with Code", True)
                    # Test auth/me with user session
                    me_response = user_session.get(f"{self.base_url}/api/auth/me")
                    if me_response.status_code == 200:
                        me_data = me_response.json()
                        if me_data.get("role") == "user":
                            self.log_test("Get User Auth Me", True)
                        else:
                            self.log_test("Get User Auth Me", False, f"Invalid role: {me_data.get('role')}")
                    else:
                        self.log_test("Get User Auth Me", False, f"Status {me_response.status_code}")
                    return True
                else:
                    self.log_test("User Login with Code", False, f"Invalid role: {data.get('role')}")
                    return False
            else:
                self.log_test("User Login with Code", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("User Login with Code", False, f"Exception: {str(e)}")
            return False

    def test_user_login_invalid_code(self):
        """Test user login with invalid code"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/auth/user/login",
                json={"code": "INVALID123"}
            )
            
            if response.status_code == 401:
                self.log_test("User Login Invalid Code", True)
                return True
            else:
                self.log_test("User Login Invalid Code", False, f"Expected 401, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("User Login Invalid Code", False, f"Exception: {str(e)}")
            return False

    def test_get_settings(self):
        """Test getting settings"""
        try:
            response = self.session.get(f"{self.base_url}/api/settings")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["shared_code", "shared_code_description", "instructions_text", "instructions_steps"]
                if all(field in data for field in required_fields):
                    self.log_test("Get Settings", True)
                    return True
                else:
                    missing = [field for field in required_fields if field not in data]
                    self.log_test("Get Settings", False, f"Missing fields: {missing}")
                    return False
            else:
                self.log_test("Get Settings", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Get Settings", False, f"Exception: {str(e)}")
            return False

    def test_update_settings(self):
        """Test updating settings"""
        try:
            update_data = {
                "shared_code": "5678",
                "shared_code_description": "Updated test description"
            }
            
            response = self.session.put(
                f"{self.base_url}/api/settings",
                json=update_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("shared_code") == "5678":
                    self.log_test("Update Settings", True)
                    # Revert back to original
                    revert_data = {
                        "shared_code": "1234",
                        "shared_code_description": "Kod till nyckelskåpet i entrén"
                    }
                    self.session.put(f"{self.base_url}/api/settings", json=revert_data)
                    return True
                else:
                    self.log_test("Update Settings", False, f"Settings not updated correctly: {data}")
                    return False
            else:
                self.log_test("Update Settings", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Update Settings", False, f"Exception: {str(e)}")
            return False

    def test_update_access_code(self):
        """Test updating an access code"""
        if not self.test_access_code_id:
            self.log_test("Update Access Code", False, "No test access code ID available")
            return False
            
        try:
            update_data = {
                "name": "Updated Test User",
                "description": "Updated description"
            }
            
            response = self.session.put(
                f"{self.base_url}/api/access-codes/{self.test_access_code_id}",
                json=update_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("name") == "Updated Test User":
                    self.log_test("Update Access Code", True)
                    return True
                else:
                    self.log_test("Update Access Code", False, f"Code not updated correctly: {data}")
                    return False
            else:
                self.log_test("Update Access Code", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Update Access Code", False, f"Exception: {str(e)}")
            return False

    def test_delete_access_code(self):
        """Test deleting an access code"""
        if not self.test_access_code_id:
            self.log_test("Delete Access Code", False, "No test access code ID available")
            return False
            
        try:
            response = self.session.delete(f"{self.base_url}/api/access-codes/{self.test_access_code_id}")
            
            if response.status_code == 200:
                self.log_test("Delete Access Code", True)
                return True
            else:
                self.log_test("Delete Access Code", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Delete Access Code", False, f"Exception: {str(e)}")
            return False

    def test_logout(self):
        """Test logout functionality"""
        try:
            response = self.session.post(f"{self.base_url}/api/auth/logout")
            
            if response.status_code == 200:
                # Try to access protected endpoint after logout
                me_response = self.session.get(f"{self.base_url}/api/auth/me")
                if me_response.status_code == 401:
                    self.log_test("Logout", True)
                    return True
                else:
                    self.log_test("Logout", False, f"Still authenticated after logout: {me_response.status_code}")
                    return False
            else:
                self.log_test("Logout", False, f"Status {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("Logout", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🔍 Starting Backend API Tests for Kopplingsguide")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test admin authentication flow
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return False
            
        self.test_admin_login_invalid()
        self.test_get_auth_me_admin()
        
        # Test access codes CRUD
        self.test_create_access_code()
        self.test_get_access_codes()
        self.test_update_access_code()
        
        # Test user authentication
        self.test_user_login_with_code()
        self.test_user_login_invalid_code()
        
        # Test settings
        self.test_get_settings()
        self.test_update_settings()
        
        # Cleanup and logout
        self.test_delete_access_code()
        self.test_logout()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Backend Tests Summary:")
        print(f"✅ Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print("\n🚨 Failed Tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        return len(self.failed_tests) == 0

def main():
    tester = KopplingsguideAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())