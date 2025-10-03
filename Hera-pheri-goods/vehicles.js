document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const vehicleSearchForm = document.getElementById('vehicleSearchForm');
    const vehicleTypeSelect = document.getElementById('vehicleType');
    const stateSelect = document.getElementById('state');
    const cityInput = document.getElementById('city');
    const pincodeInput = document.getElementById('pincode');
    const verifyPincodeBtn = document.getElementById('verifyPincodeBtn');
    const vehiclesGrid = document.getElementById('vehiclesGrid');
    const resultsCount = document.getElementById('resultsCount');
    const noResults = document.getElementById('noResults');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const sortSelect = document.getElementById('sortBy');
    const vehicleModal = document.getElementById('vehicleModal');
    const modalClose = document.getElementById('modalClose');
    const modalHeader = document.getElementById('modalHeader');
    const modalGallery = document.getElementById('modalGallery');
    const modalInfo = document.getElementById('modalInfo');
    const contactDriverBtn = document.getElementById('contactDriverBtn');
    const imageLightbox = document.getElementById('imageLightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const closeLightbox = document.getElementById('closeLightbox');
    const favoriteBtn = document.getElementById('favoriteBtn');
    
    // API endpoint (replace with your actual backend URL)
    const API_BASE_URL = (window.API_BASE_URL ? `${window.API_BASE_URL}/api/` : "http://localhost:8080/api/");
    
    // Log the API base URL for debugging
    console.log('Using API base URL:', API_BASE_URL);
    
    // Remove direct Supabase usage in frontend
    const REGISTRATIONS_TABLE = "registration";
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const authSection = document.getElementById('authSection');
    
    if (isLoggedIn) {
        authSection.style.display = 'block';
    }
    
    // Set city and state fields as readonly
    cityInput.setAttribute('readonly', 'readonly');
    stateSelect.removeAttribute('disabled');
    stateSelect.setAttribute('readonly', 'readonly');
    
    // Add visual indication that these fields can't be edited directly
    cityInput.style.backgroundColor = '#ffffff';
    stateSelect.style.backgroundColor = '#ffffff';
    
    // Prevent state select from being changed by user
    stateSelect.addEventListener('mousedown', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Parse URL parameters to pre-fill the form
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('type')) {
        const vehicleType = urlParams.get('type');
        console.log('Setting vehicle type from URL:', vehicleType);
        
        // Add a small delay to ensure dropdown is fully loaded
        setTimeout(() => {
            console.log('Available dropdown options:', Array.from(vehicleTypeSelect.options).map(opt => ({value: opt.value, text: opt.text})));
            
            // Try to set the value directly first
            vehicleTypeSelect.value = vehicleType;
            
            // Check if the value was set correctly
            if (vehicleTypeSelect.value !== vehicleType) {
                console.warn('Vehicle type mismatch! URL has:', vehicleType, 'but dropdown shows:', vehicleTypeSelect.value);
                console.log('Dropdown element:', vehicleTypeSelect);
                console.log('Dropdown selectedIndex:', vehicleTypeSelect.selectedIndex);
                
                // Try alternative methods
                console.log('Trying to find option by value...');
                let found = false;
                for (let i = 0; i < vehicleTypeSelect.options.length; i++) {
                    const option = vehicleTypeSelect.options[i];
                    console.log(`Option ${i}: value="${option.value}" text="${option.text}"`);
                    if (option.value === vehicleType) {
                        console.log('Found exact match by value!');
                        vehicleTypeSelect.selectedIndex = i;
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    console.log('Trying to find option by text...');
                    for (let i = 0; i < vehicleTypeSelect.options.length; i++) {
                        const option = vehicleTypeSelect.options[i];
                        if (option.text.toLowerCase().includes(vehicleType.toLowerCase().replace('&', ''))) {
                            console.log('Found partial match by text!');
                            vehicleTypeSelect.selectedIndex = i;
                            found = true;
                            break;
                        }
                    }
                }
                
                // Special handling for Packer&Movers
                if (!found && vehicleType === 'Packer&Movers') {
                    console.log('Special handling for Packer&Movers...');
                    for (let i = 0; i < vehicleTypeSelect.options.length; i++) {
                        const option = vehicleTypeSelect.options[i];
                        if (option.value === 'Packer&Movers' || option.text.includes('Packers') || option.text.includes('Movers')) {
                            console.log('Found Packer&Movers by special handling!');
                            vehicleTypeSelect.selectedIndex = i;
                            found = true;
                            break;
                        }
                    }
                }
                
                if (!found) {
                    console.error('Could not find matching option for:', vehicleType);
                }
            } else {
                console.log('Vehicle type set successfully:', vehicleTypeSelect.value);
            }
        }, 100);
    }
    if (urlParams.has('state')) {
        stateSelect.value = urlParams.get('state');
    }
    if (urlParams.has('city')) {
        cityInput.value = urlParams.get('city');
    }
    if (urlParams.has('pincode')) {
        pincodeInput.value = urlParams.get('pincode');
    }
    
    // If parameters are present in URL, just prompt user to verify pincode
    if (urlParams.has('type') || urlParams.has('state') || urlParams.has('pincode')) {
        setTimeout(() => {
            showToast('Please verify your pincode to see available vehicles', 'info');
        }, 1000);
    }
    
    // Handle pincode input validation
    pincodeInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
        if (this.value.length > 6) {
            this.value = this.value.slice(0, 6);
        }
    });

    // Verify pincode button click event
    verifyPincodeBtn.addEventListener('click', function() {
        const pincodeValue = pincodeInput.value.trim();
        
        console.log('Verifying pincode:', pincodeValue);
        
        if (pincodeValue && /^\d{6}$/.test(pincodeValue)) {
            // Change button text to show loading
            const originalBtnText = verifyPincodeBtn.innerHTML;
            verifyPincodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            verifyPincodeBtn.disabled = true;
            
            // Call India Post API to verify pincode
            fetch(`https://api.postalpincode.in/pincode/${pincodeValue}`)
                .then(response => {
                    console.log('Pincode API response status:', response.status);
                    return response.json();
                })
                .then(data => {
                    console.log('Pincode API response:', data);
                    verifyPincodeBtn.innerHTML = originalBtnText;
                    verifyPincodeBtn.disabled = false;
                    
                    // Process API response
                    handlePincodeResponse(data, pincodeValue);
                })
                .catch(error => {
                    console.error('Error verifying pincode:', error);
                    verifyPincodeBtn.innerHTML = originalBtnText;
                    verifyPincodeBtn.disabled = false;
                    showToast('Error verifying pincode. Please try again.', 'error');
                    
                    // Try manual validation as fallback
                    handleManualPincodeValidation(pincodeValue);
                });
        } else {
            showToast('Please enter a valid 6-digit pincode', 'error');
        }
    });
    
    // Function to handle pincode API response
    function handlePincodeResponse(data, pincodeValue) {
        if (data && data[0].Status === 'Success') {
            const postOffice = data[0].PostOffice[0];
            
            // Auto-fill fields
            // Set state by value instead of index for more reliable behavior
            const stateValue = postOffice.State || postOffice.Circle;
            for (let i = 0; i < stateSelect.options.length; i++) {
                if (stateSelect.options[i].value === stateValue) {
                    stateSelect.selectedIndex = i;
                    break;
                }
            }
            
            // Set city
            cityInput.value = postOffice.District || postOffice.Division || postOffice.Region || postOffice.Block;
            
            // Add visual confirmation
            cityInput.style.borderColor = '#4CAF50';
            cityInput.style.boxShadow = '0 0 5px rgba(76, 175, 80, 0.5)';
            stateSelect.style.borderColor = '#4CAF50';
            stateSelect.style.boxShadow = '0 0 5px rgba(76, 175, 80, 0.5)';
            
            // Update location note
            const locationNote = document.querySelector('.location-note');
            if (locationNote) {
                locationNote.innerHTML = 'Location verified';
                locationNote.style.color = '#ffffff';
            }
            
            // Log successful verification
            console.log('Pincode verification successful:', {
                pincode: pincodeValue,
                state: stateValue,
                city: cityInput.value
            });
            
            // Show success message
            showToast('Pincode verified successfully!', 'success');
            
            // Don't automatically trigger search after verification anymore
            // Let the user click the search button themselves
        } else {
            console.log('API response indicates failure or no data:', data);
            
            // Try manual verification as fallback
            handleManualPincodeValidation(pincodeValue);
        }
    }
    
    // Function to handle manual pincode validation
    function handleManualPincodeValidation(pincode) {
        if (!pincode || !/^\d{6}$/.test(pincode)) {
            console.log('Invalid pincode format for manual validation:', pincode);
            showToast('Invalid pincode format. Please enter a valid 6-digit pincode.', 'error');
            return;
        }
        
        console.log('Attempting manual pincode validation for:', pincode);
        
        // Try to infer state from first 2 digits of pincode
        const statePrefix = pincode.substring(0, 2);
        let state = '';
        
        // Map of pincode prefixes to states
        const pincodeStateMap = {
            '11': 'Delhi',
            '12': 'Haryana',
            '13': 'Punjab',
            '14': 'Punjab',
            '15': 'Punjab',
            '16': 'Punjab',
            '17': 'Himachal Pradesh',
            '18': 'Jammu and Kashmir',
            '19': 'Jammu and Kashmir',
            '20': 'Uttar Pradesh',
            '21': 'Uttar Pradesh',
            '22': 'Uttar Pradesh',
            '23': 'Uttar Pradesh',
            '24': 'Uttar Pradesh',
            '25': 'Uttar Pradesh',
            '26': 'Uttar Pradesh',
            '27': 'Uttar Pradesh',
            '28': 'Uttar Pradesh',
            '30': 'Rajasthan',
            '31': 'Rajasthan',
            '32': 'Rajasthan',
            '33': 'Rajasthan',
            '34': 'Rajasthan',
            '36': 'Gujarat',
            '37': 'Gujarat',
            '38': 'Gujarat',
            '39': 'Gujarat',
            '40': 'Maharashtra',
            '41': 'Maharashtra',
            '42': 'Maharashtra',
            '43': 'Maharashtra',
            '44': 'Maharashtra',
            '45': 'Maharashtra',
            '50': 'Telangana',
            '51': 'Andhra Pradesh',
            '52': 'Andhra Pradesh',
            '53': 'Karnataka',
            '56': 'Karnataka',
            '57': 'Karnataka',
            '60': 'Tamil Nadu',
            '61': 'Tamil Nadu',
            '62': 'Tamil Nadu',
            '63': 'Tamil Nadu',
            '64': 'Tamil Nadu',
            '67': 'Kerala',
            '68': 'Kerala',
            '69': 'Kerala',
            '70': 'West Bengal',
            '71': 'West Bengal',
            '72': 'Tripura',
            '73': 'Assam',
            '74': 'Bihar',
            '75': 'Bihar',
            '76': 'Odisha',
            '77': 'Odisha',
            '78': 'North Eastern',
            '79': 'Jharkhand',
            '80': 'Madhya Pradesh',
            '81': 'Madhya Pradesh',
            '82': 'Madhya Pradesh',
            '83': 'Chhattisgarh',
            '90': 'Uttar Pradesh',
            '91': 'Uttar Pradesh',
            '99': 'Military Postal Service'
        };
        
        state = pincodeStateMap[statePrefix] || '';
        
        if (state) {
            // Try to find the state in the dropdown
            for (let i = 0; i < stateSelect.options.length; i++) {
                if (stateSelect.options[i].value === state) {
                    stateSelect.selectedIndex = i;
                    break;
                }
            }
            
            // Set generic city value
            cityInput.value = "Unknown";
            
            // Add visual confirmation
            cityInput.style.borderColor = '#4CAF50';
            cityInput.style.boxShadow = '0 0 5px rgba(76, 175, 80, 0.5)';
            stateSelect.style.borderColor = '#4CAF50';
            stateSelect.style.boxShadow = '0 0 5px rgba(76, 175, 80, 0.5)';
            
            // Update location note
            const locationNote = document.querySelector('.location-note');
            if (locationNote) {
                locationNote.innerHTML = 'Location verified (approximate)';
                locationNote.style.color = '#ffffff';
            }
            
            console.log('Manual pincode validation successful:', {
                pincode: pincode,
                state: state,
                city: 'Unknown'
            });
            
            // Show success message
            showToast('Pincode verified (approximated location)!', 'success');
            
            // Don't automatically trigger search after verification anymore
            // Let the user click the search button themselves
        } else {
            // Reset and show error
            console.log('Could not determine state from pincode:', pincode);
            cityInput.value = '';
            stateSelect.selectedIndex = 0;
            showToast('Could not verify pincode. Please check and try again.', 'error');
        }
    }
    
    // Function to show toast message
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Use longer duration for error messages
        const duration = type === 'error' ? 6000 : 3000;
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, duration);
    }
    
    // Search form submission
    vehicleSearchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const vehicleType = vehicleTypeSelect.value;
        const state = stateSelect.value;
        const city = cityInput.value;
        const pincode = pincodeInput.value.trim();
        
        console.log('Form submitted with values:', { vehicleType, state, city, pincode });
        console.log('Form validation starting...');
        
        // Validate inputs - require pincode verification
        if (!pincode) {
            console.log('Error: Pincode empty');
            showToast('Please enter and verify a pincode first', 'error');
            pincodeInput.focus();
            return;
        }
        
        // Make sure pincode is 6 digits for India
        if (!/^\d{6}$/.test(pincode)) {
            console.log('Error: Invalid pincode format: ' + pincode);
            showToast('Please enter a valid 6-digit pincode', 'error');
            pincodeInput.focus();
            return;
        }
        
        // Validate the location is verified
        const isLocationVerified = cityInput.style.borderColor === 'rgb(76, 175, 80)' || 
                                  stateSelect.style.borderColor === 'rgb(76, 175, 80)';
        
        console.log('Location verification status:', { 
            isLocationVerified,
            cityBorderColor: cityInput.style.borderColor,
            stateBorderColor: stateSelect.style.borderColor
        });
        
        if (!isLocationVerified) {
            console.log('Error: Location not verified');
            showToast('Please verify your pincode first by clicking the Verify button', 'error');
            document.getElementById('verifyPincodeBtn').focus();
            return;
        }
        
        // Validate inputs (at least one field should be filled)
        if (!vehicleType || vehicleType === '') {
            console.log('Error: No vehicle type selected');
            showToast('Please select a vehicle type', 'error');
            vehicleTypeSelect.focus();
            return;
        }
        
        console.log('Form validation passed, proceeding with search...');
        
        // Show loading overlay
        loadingOverlay.style.display = 'flex';
        
        // Log search criteria for debugging
        console.log('Search criteria:', { vehicleType, state, city, pincode });
        
        // Fetch vehicles from the database
        try {
            console.log('Calling fetchVehiclesFromDatabase function...');
            fetchVehiclesFromDatabase(vehicleType, state, city, pincode);
        } catch (error) {
            console.error('Error in fetchVehiclesFromDatabase:', error);
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
            // Show error toast
            showToast('Error searching vehicles. Please try again.', 'error');
        }
    });
    
    // Function to fetch vehicles from the database
    function fetchVehiclesFromDatabase(vehicleType, state, city, pincode) {
        // Show loading overlay
        loadingOverlay.style.display = 'flex';
        
        // Build query parameters for API
        const queryParams = new URLSearchParams();
        if (vehicleType && vehicleType !== 'any') queryParams.append('type', vehicleType);
        if (state && state !== 'any') queryParams.append('state', state);
        if (city && city.trim() !== '') queryParams.append('city', city);
        if (pincode && pincode.trim() !== '') queryParams.append('pincode', pincode);
        
        // Use Spring Boot API
        console.log('Using Spring Boot API for vehicle search...');
        trySpringBootAPI(vehicleType, state, city, pincode, queryParams);
    }
    
    // Function to try Spring Boot API first
    function trySpringBootAPI(vehicleType, state, city, pincode, queryParams) {
        // Build API URL with proper formatting
        let apiUrl = API_BASE_URL.endsWith('/') 
            ? `${API_BASE_URL}vehicles/search` 
            : `${API_BASE_URL}/vehicles/search`;
            
        console.log('Using Spring Boot API...');
        console.log('Fetching data from:', apiUrl);
        console.log('Query parameters:', queryParams.toString());
        
        // Add fields we specifically want to retrieve
        queryParams.append('fields', 'whatsapp,whatsappNumber,whatsappNo,alternateContact,alternateNumber,alternateContactNumber');
        
        // Log the complete URL for debugging
        const fullUrl = `${apiUrl}?${queryParams.toString()}`;
        console.log('Full API URL with all parameters:', fullUrl);
        
        // Try API call with a timeout
        fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            // Set a longer timeout
            signal: AbortSignal.timeout(20000) // 20 second timeout
        })
        .then(response => {
            console.log('Spring Boot API response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
            
            return response.json().catch(error => {
                console.error('Error parsing JSON:', error);
                throw new Error('Invalid JSON response from server');
            });
        })
        .then(data => {
            console.log('Search results from Spring Boot API:', data);
            
            if (data.success && data.vehicles && data.vehicles.length > 0) {
                // Log the first vehicle to check if highlights are included
                console.log('First vehicle data sample:', data.vehicles[0]);
                
                // Check for WhatsApp and alternate contact numbers specifically
                console.log('WhatsApp fields in API response:', {
                    whatsapp: data.vehicles[0].whatsapp,
                    whatsappNumber: data.vehicles[0].whatsappNumber,
                    whatsappNo: data.vehicles[0].whatsappNo
                });
                
                console.log('Alternate contact fields in API response:', {
                    alternateContact: data.vehicles[0].alternateContact,
                    alternateNumber: data.vehicles[0].alternateNumber,
                    alternateContactNumber: data.vehicles[0].alternateContactNumber
                });
                
                // Check for highlights specifically
                if (data.vehicles[0].highlights) {
                    console.log('Highlights found in API response:', data.vehicles[0].highlights);
                } else {
                    console.warn('No highlights found in the first vehicle of API response');
                }
                
                // Apply sorting to the vehicles returned from API
                const sortedVehicles = sortResults(data.vehicles);
                
                // Display the results
                displayResults(sortedVehicles);
            } else {
                console.log('No vehicles found through Spring Boot API');
                displayResults([]);
            }
        })
        .catch(error => {
            console.error('Error with Spring Boot API:', error);
            
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
            
            // Show error toast with specific message based on error
            let errorMessage = 'Server error. Please try again later.';
            showToast(errorMessage, 'error');
            
            // Show no results
            displayResults([]);
        });
    }
    
    // Function to sort results
    function sortResults(results) {
        if (!results || results.length === 0) return results;
        
        const sortBy = sortSelect ? sortSelect.value : 'newest';
        console.log(`Sorting ${results.length} results by: ${sortBy}`);
        
        const sortedResults = [...results]; // Create a copy to avoid modifying the original
        
        // We no longer need to fetch membership from users table
        // as it's now directly stored in the registration table
        console.log('Checking premium vehicles in results...');
        
        // Log how many premium vehicles we have
        const premiumVehicles = sortedResults.filter(vehicle => vehicle.membership === 'Premium');
        console.log(`Found ${premiumVehicles.length} premium vehicles out of ${sortedResults.length} total`);
        
        // If we have any vehicles without membership info, set them to Standard
        sortedResults.forEach(vehicle => {
            if (!vehicle.membership) {
                vehicle.membership = 'Standard';
            }
        });
        
        // Always prioritize premium users by moving them to the top
        sortedResults.sort((a, b) => {
            // Check if either vehicle belongs to a premium user
            const aIsPremium = a.membership === 'Premium';
            const bIsPremium = b.membership === 'Premium';
            
            // If one is premium and the other isn't, the premium one comes first
            if (aIsPremium && !bIsPremium) return -1;
            if (!aIsPremium && bIsPremium) return 1;
            
            // If both are premium or both are not premium, sort according to selected criteria
            return 0;
        });
        
        // Then apply the selected sort criteria as a secondary sort
        switch (sortBy) {
            case 'newest':
                // Sort by date descending (newest first)
                sortedResults.sort((a, b) => {
                    // If premium status differs, keep that order
                    const aIsPremium = a.membership === 'Premium';
                    const bIsPremium = b.membership === 'Premium';
                    if (aIsPremium !== bIsPremium) return aIsPremium ? -1 : 1;
                    
                    // Otherwise sort by date
                    const dateA = a.registrationDate ? new Date(a.registrationDate) : new Date(0);
                    const dateB = b.registrationDate ? new Date(b.registrationDate) : new Date(0);
                    return dateB - dateA;
                });
                break;
            case 'oldest':
                // Sort by date ascending (oldest first)
                sortedResults.sort((a, b) => {
                    // If premium status differs, keep that order
                    const aIsPremium = a.membership === 'Premium';
                    const bIsPremium = b.membership === 'Premium';
                    if (aIsPremium !== bIsPremium) return aIsPremium ? -1 : 1;
                    
                    // Otherwise sort by date
                    const dateA = a.registrationDate ? new Date(a.registrationDate) : new Date(0);
                    const dateB = b.registrationDate ? new Date(b.registrationDate) : new Date(0);
                    return dateA - dateB;
                });
                break;
            case 'name_asc':
                // Sort by name ascending (A-Z)
                sortedResults.sort((a, b) => {
                    // If premium status differs, keep that order
                    const aIsPremium = a.membership === 'Premium';
                    const bIsPremium = b.membership === 'Premium';
                    if (aIsPremium !== bIsPremium) return aIsPremium ? -1 : 1;
                    
                    // Otherwise sort by name
                    const nameA = a.name || a.vehicleName || a.fullName || '';
                    const nameB = b.name || b.vehicleName || b.fullName || '';
                    return nameA.localeCompare(nameB);
                });
                break;
            case 'name_desc':
                // Sort by name descending (Z-A)
                sortedResults.sort((a, b) => {
                    // If premium status differs, keep that order
                    const aIsPremium = a.membership === 'Premium';
                    const bIsPremium = b.membership === 'Premium';
                    if (aIsPremium !== bIsPremium) return aIsPremium ? -1 : 1;
                    
                    // Otherwise sort by name
                    const nameA = a.name || a.vehicleName || a.fullName || '';
                    const nameB = b.name || b.vehicleName || b.fullName || '';
                    return nameB.localeCompare(nameA);
                });
                break;
            default:
                // Default to newest first
                sortedResults.sort((a, b) => {
                    // If premium status differs, keep that order
                    const aIsPremium = a.membership === 'Premium';
                    const bIsPremium = b.membership === 'Premium';
                    if (aIsPremium !== bIsPremium) return aIsPremium ? -1 : 1;
                    
                    // Otherwise sort by date
                    const dateA = a.registrationDate ? new Date(a.registrationDate) : new Date(0);
                    const dateB = b.registrationDate ? new Date(b.registrationDate) : new Date(0);
                    return dateB - dateA;
                });
        }
        
        return sortedResults;
    }
    
    // Function to display search results
    function displayResults(results) {
        // Hide loading overlay
        loadingOverlay.style.display = 'none';
        
        // Normalize results to handle different data formats
        let normalizedResults = [];
        
        try {
            if (!results) {
                // If results is null or undefined
                normalizedResults = [];
            } else if (typeof results === 'object' && !Array.isArray(results)) {
                // If results is an object but not an array, it might be a single vehicle or have a vehicles property
                if (results.vehicles && Array.isArray(results.vehicles)) {
                    normalizedResults = results.vehicles;
                } else if (results.id || results.vehicleId) {
                    // It's a single vehicle object
                    normalizedResults = [results];
                } else {
                    console.error('Unexpected results format:', results);
                    normalizedResults = [];
                }
            } else if (Array.isArray(results)) {
                // If results is already an array
                normalizedResults = results;
            } else {
                console.error('Unexpected results type:', typeof results);
                normalizedResults = [];
            }
            
            // Add additional validation - filter out any invalid results
            normalizedResults = normalizedResults.filter(vehicle => {
                return vehicle && typeof vehicle === 'object' && 
                    (vehicle.id || vehicle.vehicleId || vehicle.registrationNumber);
            });
            
            // Process all vehicles to normalize their data
            normalizedResults.forEach(vehicle => {
                // Debug: Log each vehicle before processing
                console.log('Processing vehicle ID: ' + (vehicle.id || 'unknown'), 
                           'has highlights object:', !!vehicle.highlights, 
                           'has serviceHighlights array:', !!vehicle.serviceHighlights);
                
                // Process service highlights
                if (!vehicle.serviceHighlights) {
                    vehicle.serviceHighlights = [];
                    
                    // Extract highlights from the database format
                    if (vehicle.highlights) {
                        const h = vehicle.highlights;
                        console.log('Vehicle highlights from API:', h);
                        if (h.highlight1) vehicle.serviceHighlights.push(h.highlight1);
                        if (h.highlight2) vehicle.serviceHighlights.push(h.highlight2);
                        if (h.highlight3) vehicle.serviceHighlights.push(h.highlight3);
                        if (h.highlight4) vehicle.serviceHighlights.push(h.highlight4);
                        if (h.highlight5) vehicle.serviceHighlights.push(h.highlight5);
                    } else {
                        // Check direct properties
                        if (vehicle.highlight1) vehicle.serviceHighlights.push(vehicle.highlight1);
                        if (vehicle.highlight2) vehicle.serviceHighlights.push(vehicle.highlight2);
                        if (vehicle.highlight3) vehicle.serviceHighlights.push(vehicle.highlight3);
                        if (vehicle.highlight4) vehicle.serviceHighlights.push(vehicle.highlight4);
                        if (vehicle.highlight5) vehicle.serviceHighlights.push(vehicle.highlight5);
                    }
                }
            });
            
            // Clear previous results
            vehiclesGrid.innerHTML = '';
            
            // Update results count
            resultsCount.textContent = `Showing ${normalizedResults.length} vehicles`;
            
            // Show/hide no results message
            if (normalizedResults.length === 0) {
                noResults.style.display = 'block';
                return;
            } else {
                noResults.style.display = 'none';
            }
            
            // Create and append vehicle cards
            normalizedResults.forEach(vehicle => {
                try {
                    const vehicleCard = createVehicleCard(vehicle);
                    vehiclesGrid.appendChild(vehicleCard);
                } catch (err) {
                    console.error('Error creating vehicle card:', err, vehicle);
                }
            });
            
            // Add a debugging log
            console.log('Displayed vehicles:', normalizedResults);
        } catch (error) {
            console.error('Error displaying results:', error);
            
            // Show error toast
            showToast('Error displaying vehicles. Please try again.', 'error');
            
            // Show no results
            noResults.style.display = 'block';
            resultsCount.textContent = 'Error displaying vehicles';
        }
    }
    
    // Function that attempts to handle image URLs intelligently with retry and fallback mechanisms
    function getImageUrlsForVehicle(vehicle, callback) {
        // Start with existing methods if available
        if (vehicle.images && vehicle.images.length > 0) {
            console.log('Using existing images array:', vehicle.images);
            callback(vehicle.images);
            return;
        }
        
        if (vehicle.vehicleImageUrls && vehicle.vehicleImageUrls.length > 0) {
            console.log('Using existing vehicleImageUrls array:', vehicle.vehicleImageUrls);
            const validImages = vehicle.vehicleImageUrls.filter(url => 
                url && typeof url === 'string' && 
                !url.endsWith('.hidden_folder') && 
                !url.endsWith('.folder') && 
                url.trim() !== '');
                
            if (validImages.length > 0) {
                vehicle.images = validImages;
                callback(validImages);
                return;
            }
        }
        
        if (vehicle.vehicle_image_urls_json) {
            try {
                let imageUrls = JSON.parse(vehicle.vehicle_image_urls_json);
                console.log('Parsed image URLs from JSON:', imageUrls);
                
                const validImages = imageUrls.filter(url => 
                    url && typeof url === 'string' && 
                    !url.endsWith('.hidden_folder') && 
                    !url.endsWith('.folder') && 
                    url.trim() !== '');
                    
                if (validImages.length > 0) {
                    vehicle.images = validImages;
                    callback(validImages);
                    return;
                }
            } catch (err) {
                console.error('Error parsing vehicle_image_urls_json:', err);
            }
        }
        
        // If we have a vehicle ID but no images yet, try to fetch from API
        if (vehicle.id) {
            console.log(`Fetching images for vehicle ID: ${vehicle.id}`);
            const apiUrl = `${API_BASE_URL}registration-images/${vehicle.id}`;
            
            // Attempt a direct fetch with timeout
            const fetchWithTimeout = (url, options, timeout = 5000) => {
                return Promise.race([
                    fetch(url, options),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Request timed out')), timeout)
                    )
                ]);
            };
            
            fetchWithTimeout(apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Origin': window.location.origin
                }
            }, 5000)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Received image data from API:', data);
                const imageUrls = data.imageUrls || [];
                
                if (imageUrls && imageUrls.length > 0) {
                    const validImages = imageUrls.filter(url => 
                        url && typeof url === 'string' && 
                        !url.endsWith('.hidden_folder') && 
                        !url.endsWith('.folder') && 
                        url.trim() !== '');
                        
                    if (validImages.length > 0) {
                        vehicle.images = validImages;
                        callback(validImages);
                        return;
                    }
                }
                // If we get here, no valid images were found in the API response
                fallbackToDirectUrl();
            })
            .catch(error => {
                console.error('Error fetching images from API:', error);
                fallbackToDirectUrl();
            });
        } else {
            // No ID or other image sources, use default
            callback(['attached_assets/images/default-vehicle.png']);
        }
        
        // Try direct URL construction as fallback if everything else fails
        function fallbackToDirectUrl() {
            console.log('Falling back to direct URL construction');
            
            // Try to construct direct URLs based on registration ID patterns
            if (vehicle.id) {
                const registrationId = vehicle.id;
                
                // Construct URLs for possible image locations
                const base = window.API_BASE_URL || 'http://localhost:8080';
                const possibleUrls = [
                    `${base}/api/file/registration/${registrationId}/front.jpg`,
                    `${base}/api/file/registrations/${registrationId}/front.jpg`,
                    `${base}/api/file/vehicles/${registrationId}/front.jpg`,
                    `${base}/supabase-images/registration/${registrationId}/front.jpg`,
                    `${base}/api/images/registration/${registrationId}/front.jpg`
                ];
                
                console.log('Trying fallback URLs:', possibleUrls);
                vehicle.images = possibleUrls;
                callback(possibleUrls);
            } else {
                // No ID available, use default image
                callback(['attached_assets/images/default-vehicle.png']);
            }
        }
    }
    
    // Function to create a vehicle card
    function createVehicleCard(vehicle) {
        const card = document.createElement('div');
        card.className = 'vehicle-card';
        card.dataset.id = vehicle.id || vehicle.vehicleId || '';
        
        // Check if this is a premium user's vehicle
        // First check if membership is directly on the vehicle object
        const isPremium = vehicle.membership === 'Premium';
        
        // Log membership status for debugging
        console.log(`Vehicle ${vehicle.id} membership status: ${vehicle.membership || 'Not set'}`);
        
        if (isPremium) {
            card.classList.add('premium-vehicle');
            console.log(`Vehicle ${vehicle.id} marked as premium`);
        }
        
        // Handle image paths - check for images from different sources and folder structure
        let mainImage = 'attached_assets/images/default-vehicle.png'; // Default image
        
        console.log('Creating vehicle card for vehicle:', vehicle);
        
        // Create the card content first with default image
        const imgContainer = document.createElement('div');
        imgContainer.className = 'vehicle-image';
        
        const img = document.createElement('img');
        img.src = mainImage; // Start with default, will update async if available
        img.alt = vehicle.fullName ? `${vehicle.fullName}'s ${vehicle.vehicleType}` : 'Vehicle Image';
        img.onerror = function() {
            console.log(`Image load error, falling back to default`);
            this.src = 'attached_assets/images/default-vehicle.png';
        };
        
        imgContainer.appendChild(img);
        
        // Use our new helper function to get and set images
        getImageUrlsForVehicle(vehicle, (validImages) => {
            if (validImages && validImages.length > 0) {
                mainImage = validImages[0];
                console.log('Updating card image to:', mainImage);
                img.src = mainImage;
            }
        });
        
        // Process WhatsApp number - check all possible field names
        // This ensures we don't use contact number as fallback
        if (vehicle.whatsappNumber && vehicle.whatsappNumber !== '-') {
            // If whatsappNumber exists, use it and make sure whatsapp is set too
            vehicle.whatsapp = vehicle.whatsappNumber;
        } else if (vehicle.whatsapp && vehicle.whatsapp !== '-') {
            // If whatsapp exists, use it and make sure whatsappNumber is set too
            vehicle.whatsappNumber = vehicle.whatsapp;
        }
        
        // Log WhatsApp number for debugging
        console.log(`Vehicle ${vehicle.id || 'unknown'} WhatsApp data:`, {
            whatsappNumber: vehicle.whatsappNumber,
            whatsapp: vehicle.whatsapp
        });
        
        // Make a direct API call to get the complete vehicle data if we have an ID
        if (vehicle.id) {
            // Use a more specific endpoint that's likely to return complete vehicle data
            const apiUrl = `${API_BASE_URL}registration/${vehicle.id}?_t=${Date.now()}`;
            console.log(`Fetching complete data for vehicle card from: ${apiUrl}`);
            
            fetch(apiUrl)
                .then(response => response.json())
                .then(data => {
                    console.log(`Direct API response for vehicle card ${vehicle.id}:`, data);
                    
                    // Update WhatsApp number if found in API response
                    if (data.whatsapp || data.whatsappNumber || data.whatsappNo) {
                        const newWhatsapp = data.whatsapp || data.whatsappNumber || data.whatsappNo;
                        console.log(`Updated WhatsApp for vehicle ${vehicle.id} from direct API:`, newWhatsapp);
                        
                        // Update the vehicle object
                        vehicle.whatsapp = newWhatsapp;
                        vehicle.whatsappNumber = newWhatsapp;
                    }
                    
                    // Update alternate contact if found in API response
                    if (data.alternateContact || data.alternateNumber || data.alternateContactNumber) {
                        const newAlternate = data.alternateContact || data.alternateNumber || data.alternateContactNumber;
                        console.log(`Updated alternate contact for vehicle ${vehicle.id} from direct API:`, newAlternate);
                        
                        // Update the vehicle object
                        vehicle.alternateContact = newAlternate;
                        vehicle.alternateNumber = newAlternate;
                        vehicle.alternateContactNumber = newAlternate;
                    }
                    
                    // Update membership if found in API response
                    if (data.membership) {
                        console.log(`Updated membership for vehicle ${vehicle.id} from direct API: ${data.membership}`);
                        vehicle.membership = data.membership;
                        
                        // If this vehicle is premium, update the card styling
                        if (data.membership === 'Premium' && !card.classList.contains('premium-vehicle')) {
                            card.classList.add('premium-vehicle');
                            
                            // Add premium badge and ribbon
                            if (!imgContainer.querySelector('.premium-badge')) {
                                const premiumBadge = document.createElement('div');
                                premiumBadge.className = 'premium-badge';
                                premiumBadge.innerHTML = '<img src="attached_assets/animation/premium-unscreen.gif" alt="Premium Vehicle">';
                                imgContainer.appendChild(premiumBadge);
                                
                                const premiumRibbon = document.createElement('div');
                                premiumRibbon.className = 'premium-ribbon';
                                imgContainer.appendChild(premiumRibbon);
                            }
                            
                            // Update title and button styling
                            const title = detailsContainer.querySelector('.vehicle-title');
                            if (title) title.classList.add('premium-title');
                            
                            const button = detailsContainer.querySelector('.view-details-btn');
                            if (button) button.classList.add('premium-btn');
                        }
                    }
                })
                .catch(error => {
                    console.error(`Error fetching complete data for vehicle ${vehicle.id}:`, error);
                });
        }
        
        vehicle.contactNumber = vehicle.contactNumber || vehicle.contact || vehicle.phone || '';
        
        // Check if the vehicle is newly registered (less than one month old)
        const registrationDate = vehicle.registrationDate || vehicle.regDate || vehicle.date || '';
        let isNewVehicle = false;
        let isVerified = false;
        
        if (registrationDate) {
            try {
                const regDate = new Date(registrationDate);
                const currentDate = new Date();
                
                // Calculate the difference in milliseconds
                const diffTime = currentDate - regDate;
                // Convert to days
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                // If less than 30 days, it's a new vehicle
                if (diffDays < 30) {
                    isNewVehicle = true;
                } else {
                    // If more than 30 days, it's verified
                    isVerified = true;
                }
                
                console.log(`Vehicle ID: ${vehicle.id}, Registration Date: ${registrationDate}, Age: ${diffDays} days, New: ${isNewVehicle}, Verified: ${isVerified}`);
            } catch (error) {
                console.error('Error calculating vehicle age:', error);
            }
        }
        
        // Add new vehicle badge if applicable
        if (isNewVehicle) {
            const newBadge = document.createElement('div');
            newBadge.className = 'new-vehicle-badge';
            newBadge.innerHTML = '<img src="attached_assets/images/new (1).png" alt="New Vehicle">';
            imgContainer.appendChild(newBadge);
        }
        // Add verified badge if applicable (and not premium)
        else if (isVerified && !isPremium) {
            const verifiedBadge = document.createElement('div');
            verifiedBadge.className = 'verified-badge';
            verifiedBadge.innerHTML = '<img src="attached_assets/images/verify.png" alt="Verified Vehicle">';
            imgContainer.appendChild(verifiedBadge);
        }
        
        // Add premium badge and ribbon if applicable
        if (isPremium) {
            // Add premium badge with GIF
            const premiumBadge = document.createElement('div');
            premiumBadge.className = 'premium-badge';
            premiumBadge.innerHTML = '<img src="attached_assets/animation/premium-unscreen.gif" alt="Premium Vehicle">';
            imgContainer.appendChild(premiumBadge);
            
            // Add premium ribbon
            const premiumRibbon = document.createElement('div');
            premiumRibbon.className = 'premium-ribbon';
            imgContainer.appendChild(premiumRibbon);
        }
        
        // Create details container
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'vehicle-details';

        // Create vehicle details variables
        const vehicleName = vehicle.name || vehicle.vehicleName || vehicle.fullName || `${vehicle.type || vehicle.vehicleType || 'Vehicle'} #${vehicle.id || ''}`;
        const vehicleCity = vehicle.locationCity || vehicle.city || 'Unknown City';
        const vehicleState = vehicle.locationState || vehicle.state || 'Unknown State';
        const ownerName = vehicle.ownerName || vehicle.driverName || vehicle.owner || vehicle.fullName || 'Owner';
        
        // Get trust counter value (default to 0 if not available)
        const trustCount = vehicle.call_tracking || vehicle.callTracking || 0;
        
        // Get trust indicator text based on trust count
        function getTrustIndicatorText() {
            if (isPremium) {
                return `<div class="info-item premium-info-item">
                    <i class="fas fa-shield-alt" style="color: #FFD700;"></i>
                    <span>Premium Verified Provider</span>
                </div>`;
            } else if (trustCount === 0) {
                return '';
            } else if (trustCount >= 1 && trustCount <= 4) {
                return `<div class="info-item">
                    <i class="fas fa-star-half-alt" style="color: #ffc107;"></i>
                    <span>${trustCount} user${trustCount !== 1 ? 's' : ''} showed interest</span>
                </div>`;
            } else if (trustCount >= 5 && trustCount <= 10) {
                return `<div class="info-item">
                    <i class="fas fa-star" style="color: #4caf50;"></i>
                    <span>Getting noticed in your area</span>
                </div>`;
            } else {
                return `<div class="info-item">
                    <i class="fas fa-crown" style="color: #673ab7;"></i>
                    <span>Most trusted in your area</span>
                </div>`;
            }
        }
        
        // Ensure service highlights are processed
        if (!vehicle.serviceHighlights) {
            vehicle.serviceHighlights = [];
            
            // Extract from highlights object if it exists
            if (vehicle.highlights) {
                const h = vehicle.highlights;
                if (h.highlight1) vehicle.serviceHighlights.push(h.highlight1);
                if (h.highlight2) vehicle.serviceHighlights.push(h.highlight2);
                if (h.highlight3) vehicle.serviceHighlights.push(h.highlight3);
                if (h.highlight4) vehicle.serviceHighlights.push(h.highlight4);
                if (h.highlight5) vehicle.serviceHighlights.push(h.highlight5);
            } else {
                // Check for direct properties
                if (vehicle.highlight1) vehicle.serviceHighlights.push(vehicle.highlight1);
                if (vehicle.highlight2) vehicle.serviceHighlights.push(vehicle.highlight2);
                if (vehicle.highlight3) vehicle.serviceHighlights.push(vehicle.highlight3);
                if (vehicle.highlight4) vehicle.serviceHighlights.push(vehicle.highlight4);
                if (vehicle.highlight5) vehicle.serviceHighlights.push(vehicle.highlight5);
            }
        }
        
        // Create highlights HTML if any highlights exist
        let highlightsHTML = '';
        if (vehicle.serviceHighlights && vehicle.serviceHighlights.length > 0) {
            highlightsHTML = `
                <div class="service-highlights ${isPremium ? 'premium-highlights' : ''}">
                    ${vehicle.serviceHighlights.slice(0, 2).map(highlight => 
                        `<span class="highlight-tag ${isPremium ? 'premium-tag' : ''}">${highlight}</span>`
                    ).join('')}
                    ${vehicle.serviceHighlights.length > 2 ? `<span class="highlight-more ${isPremium ? 'premium-more' : ''}"">+${vehicle.serviceHighlights.length - 2}</span>` : ''}
                </div>
            `;
        }
        
        // Check for description - if it's a number or empty, use default text
        let description = vehicle.description || 'No description provided';
        
        // Handle special cases in the description
        if (description && typeof description === 'string') {
            // If the description starts with our 'text:' prefix, remove it
            if (description.startsWith('text:')) {
                description = description.substring(5);
            }
            
            // If description is empty after processing
            if (!description.trim()) {
                description = 'No description provided';
            }
            // If description contains only numbers, use a default description
            else if (/^\d+$/.test(description.trim())) {
            description = "This vehicle is available for transport services. Contact the owner for more details.";
            }
        }
        
        // Set the HTML for the details container
        detailsContainer.innerHTML = `
                <h3 class="vehicle-title ${isPremium ? 'premium-title' : ''}">${vehicleName}</h3>
                <div class="vehicle-info">
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${vehicleCity}, ${vehicleState}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-user"></i>
                        <span>${ownerName}</span>
                    </div>
                    ${getTrustIndicatorText()}
                    ${highlightsHTML}
                </div>
                <div class="vehicle-bottom">
                    <button class="view-details-btn ${isPremium ? 'premium-btn' : ''}">View Details</button>
            </div>
        `;
        
        // Assemble the card
        card.appendChild(imgContainer);
        card.appendChild(detailsContainer);
        
        // Add click event to view details button
        card.querySelector('.view-details-btn').addEventListener('click', function() {
            openVehicleModal(vehicle);
        });
        
        return card;
    }
    
    // Function to open vehicle details modal
    function openVehicleModal(vehicle) {
        // Handle all possible field names and provide defaults
        const vehicleName = vehicle.name || vehicle.vehicleName || vehicle.fullName || `${vehicle.type || vehicle.vehicleType || 'Vehicle'} #${vehicle.id || ''}`;
        const vehicleType = vehicle.type || vehicle.vehicleType || 'Vehicle';
        const vehicleCity = vehicle.locationCity || vehicle.city || 'Unknown';
        const vehicleState = vehicle.locationState || vehicle.state || 'Unknown';
        const vehiclePincode = vehicle.locationPincode || vehicle.pincode || '-';
        const ownerName = vehicle.ownerName || vehicle.driverName || vehicle.owner || vehicle.fullName || 'Owner';
        const ownerPhone = vehicle.ownerPhone || vehicle.driverPhone || vehicle.contactNumber || vehicle.contact || vehicle.phone || '-';
        // Check all possible field names for WhatsApp number
        let whatsappNumber = '';
        
        if (vehicle.whatsappNumber && vehicle.whatsappNumber !== '-') {
            whatsappNumber = vehicle.whatsappNumber;
        } else if (vehicle.whatsapp && vehicle.whatsapp !== '-') {
            whatsappNumber = vehicle.whatsapp;
        } else if (vehicle.whatsappNo && vehicle.whatsappNo !== '-') {
            whatsappNumber = vehicle.whatsappNo;
        }
        
        // For debugging
        console.log('WhatsApp number from vehicle data:', { 
            finalWhatsappNumber: whatsappNumber,
            fromWhatsappNumber: vehicle.whatsappNumber,
            fromWhatsapp: vehicle.whatsapp,
            fromWhatsappNo: vehicle.whatsappNo,
            vehicleId: vehicle.id
        });
        
        // Make a direct API call to get the complete vehicle data
        if (vehicle.id) {
            // Use a more specific endpoint that's likely to return complete vehicle data
            const apiUrl = `${API_BASE_URL}registration/${vehicle.id}`;
            console.log(`Fetching complete vehicle data from: ${apiUrl}`);
            
            fetch(apiUrl)
                .then(response => response.json())
                .then(data => {
                    console.log('Direct API response for this vehicle:', data);
                    
                    // Check if RC and DL documents exist in the API response
                    if (data.rc || data.d_l) {
                        console.log("API returned document data:", { rc: data.rc, dl: data.d_l });
                        
                        // Update vehicle object with document data
                        if (data.rc) vehicle.rc = data.rc;
                        if (data.d_l) vehicle.d_l = data.d_l;
                        
                        // Update document badges
                        const documentBadgesContainer = document.querySelector('.document-badges-container');
                        if (documentBadgesContainer) {
                            // Clear and recreate the badges with the updated data
                            documentBadgesContainer.innerHTML = '';
                            
                            // Create RC badge
                            const rcBadge = document.createElement('div');
                            rcBadge.className = 'document-badge-item';
                            rcBadge.innerHTML = `
                                <div class="document-badge-icon">
                                    <i class="fas fa-id-card"></i>
                                </div>
                                <div class="document-badge-info">
                                    <div class="document-badge-title">Vehicle RC</div>
                                    <div class="document-badge-status ${data.rc ? 'verified' : 'not-verified'}">
                                        <i class="fas ${data.rc ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
                                        ${data.rc ? 'Verified' : 'Not Verified'}
                                    </div>
                                    <div class="document-badge-meaning">
                                        ${data.rc ? 'Trusted Owner Badge' : 'Registration Certificate not uploaded'}
                                    </div>
                                </div>
                            `;
                            
                            // Create DL badge
                            const dlBadge = document.createElement('div');
                            dlBadge.className = 'document-badge-item';
                            dlBadge.innerHTML = `
                                <div class="document-badge-icon">
                                    <i class="fas fa-id-badge"></i>
                                </div>
                                <div class="document-badge-info">
                                    <div class="document-badge-title">Driver License</div>
                                    <div class="document-badge-status ${data.d_l ? 'verified' : 'not-verified'}">
                                        <i class="fas ${data.d_l ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                        ${data.d_l ? 'Verified' : 'Not Verified'}
                                    </div>
                                    <div class="document-badge-meaning">
                                        ${data.d_l ? 'Licensed Driver Badge' : 'Driver\'s License not uploaded'}
                                    </div>
                                </div>
                            `;
                            
                            // Add badges to container
                            documentBadgesContainer.appendChild(rcBadge);
                            documentBadgesContainer.appendChild(dlBadge);
                        }
                    }
                    
                    // Update WhatsApp number if found in API response
                    if (data.whatsapp || data.whatsappNumber || data.whatsappNo) {
                        whatsappNumber = data.whatsapp || data.whatsappNumber || data.whatsappNo;
                        console.log('Updated WhatsApp number from direct API call:', whatsappNumber);
                        
                        // Update the WhatsApp section in the modal
                        const whatsappSection = document.querySelector('.modal-info-list li:nth-child(3) .info-content');
                        if (whatsappSection) {
                            whatsappSection.innerHTML = `
                                <div class="info-label">WhatsApp</div>
                                ${whatsappNumber ? createContactInfoWithCopy(whatsappNumber) : '<div class="info-value">WhatsApp number not provided by vehicle owner</div>'}
                            `;
                        }
                        
                        // Update the contact button
                        if (whatsappNumber && whatsappNumber !== '-' && whatsappNumber !== '') {
                            contactDriverBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Contact via WhatsApp';
                            contactDriverBtn.onclick = function() {
                                const cleanNumber = whatsappNumber.replace(/\D/g, '');
                                const message = encodeURIComponent(
                                    "Hello, I got your contact from HerapheriGoods. I want to know more about your vehicle service.\nनमस्ते, मुझे आपका संपर्क HerapheriGoods से मिला है। मैं आपकी वाहन सेवा के बारे में और जानना चाहता हूँ।"
                                );
                                window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
                            };
                            contactDriverBtn.style.display = 'inline-block';
                        } else {
                            contactDriverBtn.style.display = 'none';
                        }
                    }
                    
                    // Update alternate contact if found in API response
                    if (data.alternateContact || data.alternateNumber || data.alternateContactNumber) {
                        const newAlternateNumber = data.alternateContact || data.alternateNumber || data.alternateContactNumber;
                        console.log('Updated alternate number from direct API call:', newAlternateNumber);
                        
                        // Update the alternate contact section in the modal
                        const alternateSection = document.querySelector('.modal-info-list li:nth-child(4) .info-content');
                        if (alternateSection) {
                            alternateSection.innerHTML = `
                                <div class="info-label">Alternate Number</div>
                                ${createContactInfoWithCopy(newAlternateNumber)}
                            `;
                        }
                    }
                })
                .catch(error => {
                    console.error('Error fetching complete vehicle data:', error);
                });
        }
        const alternateNumber = vehicle.alternateNumber || vehicle.alternateContactNumber || vehicle.alternateContact || '-';
        const registrationDate = vehicle.registrationDate || vehicle.regDate || vehicle.date || '';
        const registrationNumber = vehicle.registrationNumber || vehicle.regNumber || vehicle.vehicleNumber || vehicle.vehiclePlateNumber || '-';
        const vehicleId = vehicle.id || vehicle.vehicleId || '';
        const userId = vehicle.userId || vehicle.user_id || vehicle.ownerId || vehicle.owner_id || '';
        
        // Get trust counter value (default to 0 if not available)
        let trustCount = vehicle.call_tracking || vehicle.callTracking || 0;
        
        // Extract service highlights from database format
        let serviceHighlights = [];
        if (vehicle.serviceHighlights && Array.isArray(vehicle.serviceHighlights)) {
            // If serviceHighlights is already an array, use it directly
            serviceHighlights = vehicle.serviceHighlights;
        } else if (vehicle.highlights) {
            // If highlights object exists (from database format), extract all non-null values
            const highlightsObj = vehicle.highlights;
            if (highlightsObj.highlight1) serviceHighlights.push(highlightsObj.highlight1);
            if (highlightsObj.highlight2) serviceHighlights.push(highlightsObj.highlight2);
            if (highlightsObj.highlight3) serviceHighlights.push(highlightsObj.highlight3);
            if (highlightsObj.highlight4) serviceHighlights.push(highlightsObj.highlight4);
            if (highlightsObj.highlight5) serviceHighlights.push(highlightsObj.highlight5);
        } else {
            // Try to extract highlights directly if they exist on the vehicle object
            if (vehicle.highlight1) serviceHighlights.push(vehicle.highlight1);
            if (vehicle.highlight2) serviceHighlights.push(vehicle.highlight2);
            if (vehicle.highlight3) serviceHighlights.push(vehicle.highlight3);
            if (vehicle.highlight4) serviceHighlights.push(vehicle.highlight4);
            if (vehicle.highlight5) serviceHighlights.push(vehicle.highlight5);
        }
        
        // Check for description - if it's a number or empty, use default text
        let description = vehicle.description || 'No description provided';
        if (!isNaN(description) || description.trim() === '') {
            description = 'No description provided';
        }
        
        // Get modal elements
        const modalHeader = document.getElementById('modalHeader');
        const modalGallery = document.getElementById('modalGallery');
        const modalInfo = document.getElementById('modalInfo');
        const documentBadgesContainer = document.querySelector('.document-badges-container');
        const contactDriverBtn = document.getElementById('contactDriverBtn');
        const callDriverBtn = document.getElementById('callDriverBtn');
        
        // Update document badges section
        if (documentBadgesContainer) {
            documentBadgesContainer.innerHTML = ''; // Clear previous badges
            
            // Check if RC document exists
            const rcBadge = document.createElement('div');
            rcBadge.className = 'document-badge-item';
            
            if (vehicle.rc) {
                rcBadge.innerHTML = `
                    <div class="document-badge-icon">
                        <i class="fas fa-id-card"></i>
                    </div>
                    <div class="document-badge-info">
                        <div class="document-badge-title">Vehicle RC</div>
                        <div class="document-badge-status verified">
                            <i class="fas fa-check-circle"></i> Verified
                        </div>
                    </div>
                `;
            } else {
                rcBadge.innerHTML = `
                    <div class="document-badge-icon">
                        <i class="fas fa-id-card"></i>
                    </div>
                    <div class="document-badge-info">
                        <div class="document-badge-title">Vehicle RC</div>
                        <div class="document-badge-status not-verified">
                            <i class="fas fa-times-circle"></i> Not Verified
                        </div>
                    </div>
                `;
            }
            
            // Check if Driver License document exists
            const dlBadge = document.createElement('div');
            dlBadge.className = 'document-badge-item';
            
            if (vehicle.d_l) {
                dlBadge.innerHTML = `
                    <div class="document-badge-icon">
                        <i class="fas fa-id-badge"></i>
                    </div>
                    <div class="document-badge-info">
                        <div class="document-badge-title">Driver License</div>
                        <div class="document-badge-status verified">
                            <i class="fas fa-check-circle"></i> Verified
                        </div>
                    </div>
                `;
            } else {
                dlBadge.innerHTML = `
                    <div class="document-badge-icon">
                        <i class="fas fa-id-badge"></i>
                    </div>
                    <div class="document-badge-info">
                        <div class="document-badge-title">Driver License</div>
                        <div class="document-badge-status not-verified">
                            <i class="fas fa-times-circle"></i> Not Verified
                        </div>
                    </div>
                `;
            }
            
            // Add badges to container
            documentBadgesContainer.appendChild(rcBadge);
            documentBadgesContainer.appendChild(dlBadge);
        }
        
        // Show loading state
        modalHeader.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading vehicle details...</span>
            </div>
        `;
        modalGallery.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i></div>';
        
        // Function to update the trust counter in the database
        function updateTrustCounter() {
            // Only update if we have a valid vehicle ID
            if (!vehicleId) {
                console.warn('Cannot update trust counter: No vehicle ID available');
                return;
            }
            
            // Increment local counter for immediate UI feedback
            trustCount++;
            
            // Update the trust counter display in the modal
            const trustCounterElement = document.getElementById('trustCounter');
            if (trustCounterElement) {
                trustCounterElement.textContent = trustCount;
            }
            
            // Update the trust indicator message based on new count
            updateTrustIndicatorMessage();
            
            // Prepare the API endpoint (backend only)
            const apiUrl = `${API_BASE_URL}vehicles/update-trust-counter/${vehicleId}`;
            
            console.log('Updating trust counter for vehicle ID:', vehicleId);
            
            // Backend API update only
            fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update trust counter');
                }
                return response.json();
            })
            .then(data => {
                console.log('Trust counter updated successfully:', data);
            })
            .catch(error => {
                console.error('Error updating trust counter:', error);
                // Revert the local counter on error
                trustCount--;
                if (trustCounterElement) {
                    trustCounterElement.textContent = trustCount;
                }
                // Also revert the trust indicator message
                updateTrustIndicatorMessage();
            });
        }
        
        // Function to update the trust indicator message based on current count
        function updateTrustIndicatorMessage() {
            const trustIndicator = document.querySelector('.trust-indicator');
            if (!trustIndicator) return;
            
            let levelClass, icon, header, message;
            
            if (trustCount >= 1 && trustCount <= 4) {
                levelClass = 'trust-level-low';
                icon = 'fa-star-half-alt';
                header = 'Getting Started';
                message = 'A few users have interest in this vehicle owner.';
            } else if (trustCount >= 5 && trustCount <= 10) {
                levelClass = 'trust-level-medium';
                icon = 'fa-star';
                header = 'Growing Reputation';
                message = 'This owner is getting noticed in your area.';
            } else {
                levelClass = 'trust-level-highest';
                icon = 'fa-crown';
                header = 'Highly Trusted';
                message = 'Most trusted vehicle owner in your area.';
            }
            
            // Remove all level classes and add the current one
            trustIndicator.classList.remove('trust-level-low', 'trust-level-medium', 'trust-level-high', 'trust-level-highest');
            trustIndicator.classList.add(levelClass);
            
            // Update the icon
            const iconElement = trustIndicator.querySelector('.trust-indicator-header i');
            if (iconElement) {
                iconElement.className = `fas ${icon}`;
            }
            
            // Update the header text
            const headerElement = trustIndicator.querySelector('.trust-indicator-header span');
            if (headerElement) {
                headerElement.textContent = header;
            }
            
            // Update the message
            const messageElement = trustIndicator.querySelector('.trust-indicator-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
            
            // Also update the counter text
            const counterElement = document.querySelector('.trust-counter-large span');
            if (counterElement) {
                counterElement.innerHTML = `<span id="trustCounter" class="trust-counter-number">${trustCount}</span> user${trustCount !== 1 ? 's' : ''} showed interest in this vehicle`;
            }
        }
        
        // Function to actually show the modal content once we have images
        function displayModalContent(images) {
            // Make sure images is an array and filter out invalid URLs
            if (!images) images = [];
            if (!Array.isArray(images)) images = [images];
            
            // Filter out invalid URLs and hidden folder markers
            images = images.filter(url => url && typeof url === 'string' && 
                !url.endsWith('.hidden_folder') && 
                !url.endsWith('.folder') && 
                url.trim() !== '');
            
            // Add default image if no images are provided
            if (images.length === 0) {
                images.push('attached_assets/images/default-vehicle.png');
            }
            
            // Check if the vehicle is newly registered (less than one month old)
            let isNewVehicle = false;
            let isVerified = false;
            
            if (registrationDate) {
                try {
                    const regDate = new Date(registrationDate);
                    const currentDate = new Date();
                    
                    // Calculate the difference in milliseconds
                    const diffTime = currentDate - regDate;
                    // Convert to days
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    
                    // If less than 30 days, it's a new vehicle
                    if (diffDays < 30) {
                        isNewVehicle = true;
                    } else {
                        // If more than 30 days, it's verified
                        isVerified = true;
                    }
                } catch (error) {
                    console.error('Error calculating vehicle age:', error);
                }
            }
            
            // Prepare badge HTML based on vehicle status
            let badgeHTML = '';
            let statusInfoHTML = '';
            
            if (isNewVehicle) {
                badgeHTML = `<div class="new-vehicle-badge" style="top: 20px; right: 20px; width: 50px; height: 50px;">
                    <img src="attached_assets/images/new (1).png" alt="New Vehicle">
                </div>`;
                
                statusInfoHTML = `
                    <div class="modal-section" style="margin-top: 15px; background-color: #fff8e1; padding: 10px; border-radius: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="attached_assets/images/new (1).png" alt="New Vehicle" style="width: 30px; height: 30px;">
                            <div>
                                <div style="font-weight: 600; color: #333;">New Vehicle Owner</div>
                                <div style="font-size: 14px; color: #666;">This owner recently registered their vehicle with us.</div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (isVerified && !isPremium) {
                badgeHTML = `<div class="verified-badge" style="top: 20px; left: 20px; width: 50px; height: 50px;">
                    <img src="attached_assets/images/verify.png" alt="Verified Vehicle">
                </div>`;
                
                statusInfoHTML = `
                    <div class="modal-section" style="margin-top: 15px; background-color: #e8f5e9; padding: 10px; border-radius: 8px; border-left: 4px solid #4caf50;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="attached_assets/images/verify.png" alt="Verified Vehicle" style="width: 30px; height: 30px;">
                            <div>
                                <div style="font-weight: 600; color: #333;">Verified by Us</div>
                                <div style="font-size: 14px; color: #666;">This vehicle has been with us for over a month and has been verified.</div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // We'll create document badges later after the modal HTML is populated
            
            // Populate modal header
            modalHeader.innerHTML = `
                <img src="${images[0]}" alt="${vehicleName}" class="modal-header-image" onerror="this.src='attached_assets/images/default-vehicle.png'">
                ${badgeHTML}
            `;
            // Bind click to open full image
            const headerImg = modalHeader.querySelector('.modal-header-image');
            if (headerImg) {
                headerImg.style.cursor = 'zoom-in';
                headerImg.addEventListener('click', () => {
                    lightboxImage.src = headerImg.src;
                    imageLightbox.classList.add('active');
                    document.body.style.overflow = 'hidden';
                });
            }
            
            // Populate gallery
            modalGallery.innerHTML = '';
            images.forEach((image, index) => {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                galleryItem.innerHTML = `<img src="${image}" alt="Vehicle image ${index + 1}" onerror="this.src='attached_assets/images/default-vehicle.png'">`;
                
                // Add click event to switch main image
                galleryItem.addEventListener('click', function() {
                    const header = document.querySelector('.modal-header-image');
                    if (header) header.src = image;
                });
                
                modalGallery.appendChild(galleryItem);
            });
            
            // Format service highlights
            let highlightsHTML = '';
            if (serviceHighlights && serviceHighlights.length > 0) {
                highlightsHTML = `
                    <ul class="modal-info-list">
                        ${serviceHighlights.map(highlight => `
                            <li class="modal-info-item">
                                <div class="info-icon"><i class="fas fa-check-circle"></i></div>
                                <div class="info-content">
                                    <div class="info-value">${highlight}</div>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                `;
            } else {
                highlightsHTML = '<p>No service highlights available</p>';
            }
            
            // Helper function to create contact info with copy button
            function createContactInfoWithCopy(value) {
                if (value === '-') return `<div class="info-value">${value}</div>`;
                
                return `
                    <div class="info-value-container">
                        <div class="info-value">${value}</div>
                        <i class="fas fa-copy copy-btn" title="Copy to clipboard" data-value="${value}"></i>
                    </div>
                `;
            }
            
            // Helper function to create contact info with copy and call buttons
            function createContactInfoWithCopyAndCall(value) {
                if (value === '-') return `<div class="info-value">${value}</div>`;
                
                return `
                    <div class="info-value-container">
                        <div class="info-value">${value}</div>
                        <i class="fas fa-copy copy-btn" title="Copy to clipboard" data-value="${value}"></i>
                    </div>
                `;
            }
            
            // Create trust counter HTML
            const trustCounterHTML = `
                <div class="trust-counter-large">
                    <i class="fas fa-shield-alt"></i>
                    <span><span id="trustCounter" class="trust-counter-number">${trustCount}</span> user${trustCount !== 1 ? 's' : ''} showed interest in this vehicle</span>
                </div>
            `;
            
            // Create trust indicator HTML with dynamic messaging based on trust count
            function getTrustIndicator() {
                let levelClass, icon, header, message;
                
                if (trustCount === 0) {
                    return ''; // No indicator for zero trust count
                } else if (trustCount >= 1 && trustCount <= 4) {
                    levelClass = 'trust-level-low';
                    icon = 'fa-star-half-alt';
                    header = 'Getting Started';
                    message = 'A few users have interest in this vehicle owner.';
                } else if (trustCount >= 5 && trustCount <= 10) {
                    levelClass = 'trust-level-medium';
                    icon = 'fa-star';
                    header = 'Growing Reputation';
                    message = 'This owner is getting noticed in your area.';
                } else {
                    levelClass = 'trust-level-highest';
                    icon = 'fa-crown';
                    header = 'Highly Trusted';
                    message = 'Most trusted vehicle owner in your area.';
                }
                
                return `
                    <div class="trust-indicator ${levelClass}">
                        <div class="trust-indicator-header">
                            <i class="fas ${icon}"></i>
                            <span>${header}</span>
                        </div>
                        <div class="trust-indicator-message">
                            ${message}
                        </div>
                    </div>
                `;
            }
            
            // Check if this is a manual cart
            const isManualCart = vehicleType && vehicleType.toLowerCase().includes('manual') || 
                                (registrationNumber && registrationNumber.startsWith('MANUAL-CART-'));
            
            // Create registration number section based on vehicle type
            let registrationNumberSection = '';
            if (!isManualCart) {
                registrationNumberSection = `
                    <li class="modal-info-item">
                        <div class="info-icon"><i class="fas fa-id-card"></i></div>
                        <div class="info-content">
                            <div class="info-label">Registration Number</div>
                            ${createContactInfoWithCopy(registrationNumber)}
                        </div>
                    </li>
                `;
            }
            
            // Populate vehicle info
            modalInfo.innerHTML = `
                <div class="left-column">
                    ${trustCount > 0 ? trustCounterHTML : ''}
                    ${getTrustIndicator()}
                    ${statusInfoHTML}
                    <div class="modal-section">
                        <h4 class="modal-section-title">Vehicle Details</h4>
                        <ul class="modal-info-list">
                            <li class="modal-info-item">
                                <div class="info-icon"><i class="fas fa-truck"></i></div>
                                <div class="info-content">
                                    <div class="info-label">Vehicle Type</div>
                                    <div class="info-value">${vehicleType}</div>
                                </div>
                            </li>
                            ${registrationNumberSection}
                            <li class="modal-info-item">
                                <div class="info-icon"><i class="fas fa-map-marker-alt"></i></div>
                                <div class="info-content">
                                    <div class="info-label">Location</div>
                                    <div class="info-value">${vehicleCity}, ${vehicleState}</div>
                                </div>
                            </li>
                            <li class="modal-info-item">
                                <div class="info-icon"><i class="fas fa-thumbtack"></i></div>
                                <div class="info-content">
                                    <div class="info-label">Pincode</div>
                                    <div class="info-value">${vehiclePincode}</div>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div class="modal-section">
                        <h4 class="modal-section-title"><i class="fas fa-cogs"></i> Service Highlights</h4>
                        ${highlightsHTML}
                    </div>
                </div>
                <div class="right-column">
                    <div class="modal-section">
                        <h4 class="modal-section-title">Owner Information</h4>
                        <ul class="modal-info-list">
                            <li class="modal-info-item">
                                <div class="info-icon"><i class="fas fa-user"></i></div>
                                <div class="info-content">
                                    <div class="info-label">Name</div>
                                    <div class="info-value">${ownerName}</div>
                                </div>
                            </li>
                            <li class="modal-info-item">
                                <div class="info-icon"><i class="fas fa-phone"></i></div>
                                <div class="info-content">
                                    <div class="info-label">Contact</div>
                                    ${createContactInfoWithCopy(ownerPhone)}
                                </div>
                            </li>
                            <li class="modal-info-item">
                                <div class="info-icon"><i class="fab fa-whatsapp"></i></div>
                                <div class="info-content">
                                    <div class="info-label">WhatsApp</div>
                                    ${whatsappNumber ? createContactInfoWithCopy(whatsappNumber) : '<div class="info-value">WhatsApp number not provided by vehicle owner</div>'}
                                </div>
                            </li>
                            <li class="modal-info-item">
                                <div class="info-icon"><i class="fas fa-phone-alt"></i></div>
                                <div class="info-content">
                                    <div class="info-label">Alternate Number</div>
                                    ${createContactInfoWithCopy(alternateNumber)}
                                </div>
                            </li>
                            ${registrationDate ? `
                            <li class="modal-info-item">
                                <div class="info-icon"><i class="fas fa-calendar-alt"></i></div>
                                <div class="info-content">
                                    <div class="info-label">Registered Since</div>
                                    <div class="info-value">${formatDate(registrationDate)}</div>
                                </div>
                            </li>` : ''}
                        </ul>
                    </div>
                    
                    <!-- Document Verification Badges Section -->
                    <div class="document-badges-section" id="documentBadges">
                        <h3><i class="fas fa-award"></i> Document Verification</h3>
                        <div class="document-badges-container">
                            <!-- Badges will be populated by JavaScript based on uploaded documents -->
                        </div>
                    </div>
                </div>
            `;
            
            // Create and populate document badges
            const documentBadgesContainer = document.querySelector('.document-badges-container');
            if (documentBadgesContainer) {
                documentBadgesContainer.innerHTML = ''; // Clear previous badges
                
                // Check if RC document exists
                const rcBadge = document.createElement('div');
                rcBadge.className = 'document-badge-item';
                
                if (vehicle.rc) {
                    rcBadge.innerHTML = `
                        <div class="document-badge-icon">
                            <i class="fas fa-id-card"></i>
                        </div>
                        <div class="document-badge-info">
                            <div class="document-badge-title">Vehicle RC</div>
                            <div class="document-badge-status verified">
                                <i class="fas fa-check-circle"></i> Verified
                            </div>
                            <div class="document-badge-meaning">Trusted Owner Badge</div>
                        </div>
                    `;
                } else {
                    rcBadge.innerHTML = `
                        <div class="document-badge-icon">
                            <i class="fas fa-id-card"></i>
                        </div>
                        <div class="document-badge-info">
                            <div class="document-badge-title">Vehicle RC</div>
                            <div class="document-badge-status not-verified">
                                <i class="fas fa-times-circle"></i> Not Verified
                            </div>
                            <div class="document-badge-meaning">Registration Certificate not uploaded</div>
                        </div>
                    `;
                }
                
                // Check if Driver License document exists
                const dlBadge = document.createElement('div');
                dlBadge.className = 'document-badge-item';
                
                if (vehicle.d_l) {
                    dlBadge.innerHTML = `
                        <div class="document-badge-icon">
                            <i class="fas fa-id-badge"></i>
                        </div>
                        <div class="document-badge-info">
                            <div class="document-badge-title">Driver License</div>
                            <div class="document-badge-status verified">
                                <i class="fas fa-check-circle"></i> Verified
                            </div>
                            <div class="document-badge-meaning">Licensed Driver Badge</div>
                        </div>
                    `;
                } else {
                    dlBadge.innerHTML = `
                        <div class="document-badge-icon">
                            <i class="fas fa-id-badge"></i>
                        </div>
                        <div class="document-badge-info">
                            <div class="document-badge-title">Driver License</div>
                            <div class="document-badge-status not-verified">
                                <i class="fas fa-times-circle"></i> Not Verified
                            </div>
                            <div class="document-badge-meaning">Driver's License not uploaded</div>
                        </div>
                    `;
                }
                
                // Add badges to container
                documentBadgesContainer.appendChild(rcBadge);
                documentBadgesContainer.appendChild(dlBadge);
            }
            
            // Add event listeners to copy buttons
            modalInfo.querySelectorAll('.copy-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const textToCopy = this.getAttribute('data-value');
                    navigator.clipboard.writeText(textToCopy)
                        .then(() => {
                            showToast('Copied to clipboard!', 'success');
                        })
                        .catch(err => {
                            console.error('Could not copy text: ', err);
                            showToast('Failed to copy text', 'error');
                        });
                });
            });
            
            // Set up contact button to use WhatsApp if available
            if (whatsappNumber && whatsappNumber !== '-' && whatsappNumber !== '') {
                contactDriverBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Contact via WhatsApp';
                contactDriverBtn.onclick = function() {
                    const cleanNumber = whatsappNumber.replace(/\D/g, '');
                    const message = encodeURIComponent("Hello, I got your contact from HerapheriGoods. I want to know more about your vehicle service.\nनमस्ते, मुझे आपका संपर्क HerapheriGoods से मिला है। मैं आपकी वाहन सेवा के बारे में और जानना चाहता हूँ।");
                    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
                };
                contactDriverBtn.style.display = 'inline-block';
            } else {
                // Hide WhatsApp button if WhatsApp number is not available
                contactDriverBtn.style.display = 'none';
            }
            
            // Set up call button
            callDriverBtn.innerHTML = '<i class="fas fa-phone"></i> Call him';
            callDriverBtn.onclick = function() {
                // Update trust counter first
                updateTrustCounter();
                
                // Then initiate the call
                if (ownerPhone && ownerPhone !== '-') {
                    window.location.href = `tel:${ownerPhone}`;
                } else if (whatsappNumber && whatsappNumber !== '-') {
                    window.location.href = `tel:${whatsappNumber}`;
                } else if (alternateNumber && alternateNumber !== '-') {
                    window.location.href = `tel:${alternateNumber}`;
                } else {
                    showToast('Contact information not available', 'error');
                }
            };

            // After modal content is rendered, refresh document badges from backend to ensure accuracy
            try {
                if (vehicleId) {
                    const docsUrl = `${API_BASE_URL}registration/${vehicleId}/documents?_t=${Date.now()}`;
                    fetch(docsUrl)
                        .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
                        .then(payload => {
                            const docs = payload && payload.documents ? payload.documents : {};
                            const rcUrl = docs.rc && docs.rc.url ? docs.rc.url : null;
                            const dlUrl = docs.dl && docs.dl.url ? docs.dl.url : null;

                            const container = document.querySelector('.document-badges-container');
                            if (!container) return;
                            container.innerHTML = '';

                            const rcBadge = document.createElement('div');
                            rcBadge.className = 'document-badge-item';
                            rcBadge.innerHTML = `
                                <div class="document-badge-icon">
                                    <i class="fas fa-id-card"></i>
                                </div>
                                <div class="document-badge-info">
                                    <div class="document-badge-title">Vehicle RC</div>
                                    <div class="document-badge-status ${rcUrl ? 'verified' : 'not-verified'}">
                                        <i class="fas ${rcUrl ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${rcUrl ? 'Verified' : 'Not Verified'}
                                    </div>
                                    <div class="document-badge-meaning">${rcUrl ? 'Trusted Owner Badge' : 'Registration Certificate not uploaded'}</div>
                                </div>`;

                            const dlBadge = document.createElement('div');
                            dlBadge.className = 'document-badge-item';
                            dlBadge.innerHTML = `
                                <div class="document-badge-icon">
                                    <i class="fas fa-id-badge"></i>
                                </div>
                                <div class="document-badge-info">
                                    <div class="document-badge-title">Driver License</div>
                                    <div class="document-badge-status ${dlUrl ? 'verified' : 'not-verified'}">
                                        <i class="fas ${dlUrl ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${dlUrl ? 'Verified' : 'Not Verified'}
                                    </div>
                                    <div class="document-badge-meaning">${dlUrl ? 'Licensed Driver Badge' : 'Driver\'s License not uploaded'}</div>
                                </div>`;

                            container.appendChild(rcBadge);
                            container.appendChild(dlBadge);
                        })
                        .catch(err => console.warn('Failed to refresh document badges:', err));
                }
            } catch (e) {
                console.warn('Error scheduling document badge refresh', e);
            }
        }
        
        // Use our helper function to get images
        getImageUrlsForVehicle(vehicle, (images) => {
            console.log('Got images for modal:', images);
            displayModalContent(images);
        });
        
        // Show modal
        vehicleModal.style.display = 'block';
    }
    
    // Function to format date
    function formatDate(dateString) {
        if (!dateString) return 'Unknown';
        
        try {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
        } catch (e) {
            console.error('Error formatting date:', e);
            return dateString; // Return the original string if there's an error
        }
    }
    
    // Close modal
    modalClose.addEventListener('click', closeModal);
    
    // Close modal if clicked outside of content
    vehicleModal.addEventListener('click', function(e) {
        if (e.target === vehicleModal) {
            closeModal();
        }
    });

    // Lightbox close handlers
    if (closeLightbox) {
        closeLightbox.addEventListener('click', () => {
            imageLightbox.classList.remove('active');
            lightboxImage.src = '';
            document.body.style.overflow = 'auto';
        });
    }
    if (imageLightbox) {
        imageLightbox.addEventListener('click', (e) => {
            if (e.target === imageLightbox) {
                imageLightbox.classList.remove('active');
                lightboxImage.src = '';
                document.body.style.overflow = 'auto';
            }
        });
    }
    
    // Function to close modal
    function closeModal() {
        vehicleModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    // Sort select change event
    sortSelect.addEventListener('change', function() {
        // Get current results and resort
        const vehicleCards = Array.from(vehiclesGrid.querySelectorAll('.vehicle-card'));
        if (vehicleCards.length === 0) return;
        
        // Get the last search parameters
        const vehicleType = vehicleTypeSelect.value;
        const state = stateSelect.value;
        const city = cityInput.value;
        const pincode = pincodeInput.value;
        
        // Show loading overlay
        loadingOverlay.style.display = 'flex';
        
        // Re-fetch with the same search criteria but new sorting
        fetchVehiclesFromDatabase(vehicleType, state, city, pincode);
    });
    
    // Update Find Vehicle button in index
    document.querySelector('.find-vehicle-btn')?.addEventListener('click', function() {
        if (typeof window.buildUrl === 'function') {
            window.location.href = window.buildUrl('vehicles');
        } else {
            window.location.href = 'vehicles';
        }
    });

    // Initial state setup - ensure the vehicle list is empty on page load
    if (vehiclesGrid) {
        vehiclesGrid.innerHTML = '';
    }
    
    // Update results count
    if (resultsCount) {
        resultsCount.textContent = 'Showing 0 vehicles';
    }
    
    // Show no results message
    if (noResults) {
        noResults.style.display = 'block';
    }
    
    // Log this setup for debugging
    console.log('Initial state set - no vehicles displayed until search');

    // Global variables for searches
    let lastSearchCriteria = null; // Store last search criteria
    let searchResults = []; // Store search results
    
    // Remove refresh page when refresh button is clicked
    const refreshBtn = document.getElementById('refresh-page');
    if (refreshBtn) {
        refreshBtn.style.display = 'none'; // Hide the refresh button instead of setting up the event
    }
    
    // Initialize any needed event listeners
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            console.log('Sorting results by:', sortSelect.value);
            const sortedResults = sortResults(searchResults);
            displayResults(sortedResults);
        });
    }
});